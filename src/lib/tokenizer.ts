import { countTokens } from "gpt-tokenizer/model/gpt-4o"

import type { Message, ContentPart, ToolCall } from "~/services/copilot/create-chat-completions"

// Convert Message to gpt-tokenizer compatible format
interface ChatMessage {
  role: "user" | "assistant" | "system"
  content: string
}

const convertToTokenizerFormat = (message: Message): ChatMessage | null => {
  // Handle tool role messages - convert to assistant for token counting
  const role = message.role === "tool" ? "assistant" : message.role

  // Handle string content
  if (typeof message.content === "string") {
    return {
      role: role as "user" | "assistant" | "system",
      content: message.content,
    }
  }

  // Handle null content (can happen with tool calls)
  if (message.content === null) {
    // If there are tool calls, convert them to text for token counting
    if (message.tool_calls && message.tool_calls.length > 0) {
      const toolCallsText = message.tool_calls
        .map((toolCall: ToolCall) => {
          return `Function call: ${toolCall.function.name}(${toolCall.function.arguments})`
        })
        .join(" ")

      return {
        role: role as "user" | "assistant" | "system",
        content: toolCallsText,
      }
    }

    // If it's a tool response, use the tool_call_id and name for context
    if (message.role === "tool" && message.name) {
      return {
        role: "assistant",
        content: `Tool response from ${message.name}`,
      }
    }

    return null
  }

  // Handle ContentPart array - extract text content
  const textContent = message.content
    .map((part: ContentPart) => {
      if (part.type === "input_text" && part.text) {
        return part.text
      }
      // For image parts, we can't count tokens meaningfully, so we'll skip them
      // or provide a placeholder. For now, we'll skip them.
      return ""
    })
    .filter(Boolean)
    .join(" ")

  // Only return a message if we have actual text content
  if (textContent.trim()) {
    return {
      role: role as "user" | "assistant" | "system",
      content: textContent,
    }
  }

  return null
}

export const getTokenCount = (messages: Array<Message>) => {
  // Convert messages to tokenizer-compatible format
  const convertedMessages = messages
    .map(convertToTokenizerFormat)
    .filter((m): m is ChatMessage => m !== null)

  const input = convertedMessages.filter((m) => m.role !== "assistant")
  const output = convertedMessages.filter((m) => m.role === "assistant")

  const inputTokens = countTokens(input)
  const outputTokens = countTokens(output)

  return {
    input: inputTokens,
    output: outputTokens,
  }
}
