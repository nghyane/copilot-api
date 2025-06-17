// Enhanced format detection
export function detectFormat(payload: any): 'anthropic' | 'openai' {
  // Check for Anthropic-specific indicators
  if (payload.system) return 'anthropic'
  if (payload.tools?.[0]?.input_schema) return 'anthropic'
  if (payload.tool_choice && typeof payload.tool_choice === 'object') return 'anthropic'

  // Check for content arrays (Anthropic format)
  const hasContentArrays = payload.messages?.some((msg: any) =>
    Array.isArray(msg.content) && msg.content.some((c: any) => c.type === 'text')
  )
  if (hasContentArrays) return 'anthropic'

  // Default to OpenAI
  return 'openai'
}

// Transform tool_choice from Anthropic to OpenAI format
function transformToolChoice(toolChoice: any): any {
  if (!toolChoice) return undefined

  // String values pass through
  if (typeof toolChoice === 'string') return toolChoice

  // Object format transformation
  if (typeof toolChoice === 'object') {
    if (toolChoice.type === 'auto') return 'auto'
    if (toolChoice.type === 'any') return 'required'
    if (toolChoice.type === 'tool' && toolChoice.name) {
      return {
        type: 'function',
        function: { name: toolChoice.name }
      }
    }
  }

  return 'auto' // Default fallback
}

// Map Claude models to supported models
function mapModelName(modelName: string): string {
  // Map Claude models to GitHub Copilot supported models
  if (modelName.includes('claude')) {
    // Map Claude 4 models to claude-sonnet-4
    if (modelName.includes('claude-4') || modelName.includes('sonnet-4')) {
      return 'claude-sonnet-4'
    }
    // Map Claude 3.7 models
    if (modelName.includes('claude-3.7') || modelName.includes('3.7')) {
      return 'claude-3.7-sonnet'
    }
    // Default to claude-3.5-sonnet for other Claude models
    return 'claude-3.5-sonnet'
  }

  // Pass through other models
  return modelName
}

// Anthropic → OpenAI
export function toOpenAI(payload: any) {
  if (detectFormat(payload) === 'openai') return payload
  
  const messages = []
  
  // System message
  if (payload.system) {
    const systemContent = Array.isArray(payload.system)
      ? payload.system.map((s: any) => s.text).join('\n')
      : payload.system

    messages.push({
      role: 'system',
      content: systemContent
    })
  }
  
  // Regular messages
  payload.messages.forEach((msg: any) => {
    messages.push({
      role: msg.role,
      content: Array.isArray(msg.content)
        ? msg.content.map((c: any) => c.text || c.content || '').filter(Boolean).join('\n')
        : msg.content
    })
  })
  
  return {
    model: mapModelName(payload.model),
    messages,
    temperature: payload.temperature,
    max_tokens: payload.max_tokens,
    stream: payload.stream,
    tools: payload.tools?.map((t: any) => ({
      type: 'function',
      function: {
        name: t.name,
        description: t.description,
        parameters: t.input_schema
      }
    })),
    tool_choice: transformToolChoice(payload.tool_choice)
  }
}

// OpenAI → Anthropic
export function toAnthropic(response: any, originalModel: string) {
  // Generate proper Anthropic-style message ID
  const messageId = `msg_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`

  const message = response.choices[0].message
  const content = []

  // Add text content if present
  if (message.content) {
    content.push({
      type: 'text',
      text: message.content
    })
  }

  // Add tool calls if present
  if (message.tool_calls) {
    for (const toolCall of message.tool_calls) {
      content.push({
        type: 'tool_use',
        id: toolCall.id,
        name: toolCall.function.name,
        input: JSON.parse(toolCall.function.arguments)
      })
    }
  }

  // Map finish_reason to stop_reason
  let stopReason = 'end_turn'
  if (response.choices[0].finish_reason === 'length') stopReason = 'max_tokens'
  else if (response.choices[0].finish_reason === 'tool_calls') stopReason = 'tool_use'

  return {
    id: messageId,
    type: 'message',
    role: 'assistant',
    content,
    model: originalModel,
    stop_reason: stopReason,
    usage: {
      input_tokens: response.usage.prompt_tokens,
      output_tokens: response.usage.completion_tokens
    }
  }
}

// Transform OpenAI stream → Anthropic stream
export async function* transformStream(openaiStream: AsyncIterable<any>, originalModel: string) {
  let isFirst = true
  let hasContent = false
  let hasToolUse = false
  let eventCount = 0
  let toolCallsState = new Map() // Track tool calls by index

  for await (const event of openaiStream) {
    eventCount++
    // Handle [DONE] event
    if (event.data === '[DONE]') {
      // Close all open content blocks
      if (hasToolUse) {
        // Close tool use blocks
        for (const [index] of toolCallsState.entries()) {
          yield {
            event: 'content_block_stop',
            data: JSON.stringify({
              type: 'content_block_stop',
              index: index
            })
          }
        }
      }

      if (hasContent) {
        // Close text content block
        yield {
          event: 'content_block_stop',
          data: JSON.stringify({
            type: 'content_block_stop',
            index: hasToolUse ? 1 : 0
          })
        }
      }

      // Send message_delta with stop_reason
      yield {
        event: 'message_delta',
        data: JSON.stringify({
          type: 'message_delta',
          delta: { stop_reason: 'end_turn', stop_sequence: null },
          usage: { output_tokens: 0 } // Will be updated by actual usage
        })
      }

      // Send final message_stop
      yield { event: 'message_stop', data: JSON.stringify({ type: 'message_stop' }) }
      break
    }

    try {
      const data = JSON.parse(event.data)
      const content = data.choices?.[0]?.delta?.content
      const toolCalls = data.choices?.[0]?.delta?.tool_calls

      // Send message_start on first event
      if (isFirst) {
        // Extract usage from first event if available
        const initialUsage = data.usage || { input_tokens: 0, output_tokens: 1 }

        yield {
          event: 'message_start',
          data: JSON.stringify({
            type: 'message_start',
            message: {
              id: `msg_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`,
              type: 'message',
              role: 'assistant',
              content: [],
              model: originalModel,
              stop_reason: null,
              stop_sequence: null,
              usage: {
                input_tokens: initialUsage.prompt_tokens || initialUsage.input_tokens || 0,
                output_tokens: 1
              }
            }
          })
        }
        isFirst = false
      }

      // Handle text content
      if (content && content.trim()) {
        if (!hasContent) {
          yield {
            event: 'content_block_start',
            data: JSON.stringify({
              type: 'content_block_start',
              index: hasToolUse ? 1 : 0,
              content_block: { type: 'text', text: '' }
            })
          }
          hasContent = true
        }

        yield {
          event: 'content_block_delta',
          data: JSON.stringify({
            type: 'content_block_delta',
            index: hasToolUse ? 1 : 0,
            delta: { type: 'text_delta', text: content }
          })
        }

        // Send occasional ping events (every 3rd content event)
        if (eventCount % 3 === 0) {
          yield {
            event: 'ping',
            data: JSON.stringify({ type: 'ping' })
          }
        }
      }

      // Handle tool calls
      if (toolCalls) {
        for (const toolCall of toolCalls) {
          const index = toolCall.index || 0

          if (!toolCallsState.has(index)) {
            // First time seeing this tool call - start the block
            const toolId = toolCall.id || `tool_${Math.random().toString(36).substring(2, 15)}`
            const toolName = toolCall.function?.name || 'unknown'

            toolCallsState.set(index, {
              id: toolId,
              name: toolName,
              arguments: ''
            })

            yield {
              event: 'content_block_start',
              data: JSON.stringify({
                type: 'content_block_start',
                index: index,
                content_block: {
                  type: 'tool_use',
                  id: toolId,
                  name: toolName,
                  input: {}
                }
              })
            }
            hasToolUse = true
          }

          // Accumulate arguments
          if (toolCall.function?.arguments) {
            const state = toolCallsState.get(index)
            state.arguments += toolCall.function.arguments

            yield {
              event: 'content_block_delta',
              data: JSON.stringify({
                type: 'content_block_delta',
                index: index,
                delta: {
                  type: 'input_json_delta',
                  partial_json: toolCall.function.arguments
                }
              })
            }
          }
        }
      }

      // Handle finish_reason
      const finishReason = data.choices?.[0]?.finish_reason
      if (finishReason) {
        // Close all open content blocks
        if (hasToolUse) {
          // Close tool use blocks
          for (const [index, state] of toolCallsState.entries()) {
            yield {
              event: 'content_block_stop',
              data: JSON.stringify({
                type: 'content_block_stop',
                index: index
              })
            }
          }
        }

        if (hasContent) {
          // Close text content block
          yield {
            event: 'content_block_stop',
            data: JSON.stringify({
              type: 'content_block_stop',
              index: hasToolUse ? 1 : 0
            })
          }
        }

        // Send message_delta with stop_reason
        let stopReason = 'end_turn'
        if (finishReason === 'length') stopReason = 'max_tokens'
        else if (finishReason === 'tool_calls') stopReason = 'tool_use'

        yield {
          event: 'message_delta',
          data: JSON.stringify({
            type: 'message_delta',
            delta: { stop_reason: stopReason, stop_sequence: null },
            usage: data.usage || { output_tokens: 0 }
          })
        }

        // Send final message_stop
        yield { event: 'message_stop', data: JSON.stringify({ type: 'message_stop' }) }
        break
      }
    } catch (e) {
      // Skip malformed events
      console.debug('Skipping malformed streaming event:', e)
    }
  }
}
