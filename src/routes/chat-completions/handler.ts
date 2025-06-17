import type { Context } from "hono"

import { streamSSE } from "hono/streaming"
import { awaitApproval } from "~/lib/approval"
import { detectFormat, toOpenAI, toAnthropic, transformStream } from "~/lib/format-transformer"
import { transformModelName } from "~/lib/models"
import { PayloadLogger } from "~/lib/payload-logger"
import { checkRateLimit } from "~/lib/rate-limit"
import { state } from "~/lib/state"
import { createChatCompletions } from "~/services/copilot/create-chat-completions"

export async function handleCompletion(c: Context) {
  await checkRateLimit(state)

  const payload = await c.req.json()
  const logger = PayloadLogger.getInstance()

  // Parallel: detect format and start logging
  const originalFormat = detectFormat(payload)
  const requestIdPromise = logger.logRequest(payload, originalFormat)

  // Parallel: transform payload and model name
  const [processedPayload, requestId] = await Promise.all([
    Promise.resolve(originalFormat === 'anthropic' ? toOpenAI(payload) : payload),
    requestIdPromise
  ])

  if (processedPayload.model) {
    processedPayload.model = transformModelName(processedPayload.model)
  }

  if (state.manualApprove) await awaitApproval()

  try {
    const response = await createChatCompletions(processedPayload)

    if (typeof response === 'object' && response.choices) {
      // Non-streaming response - parallel processing
      const [finalResponse] = await Promise.all([
        Promise.resolve(originalFormat === 'anthropic' 
          ? toAnthropic(response, payload.model) 
          : response),
        // Set headers in parallel
        originalFormat === 'anthropic' ? Promise.resolve().then(() => {
          c.header('anthropic-version', '2023-06-01')
          c.header('anthropic-beta', 'messages-2023-12-15')
          c.header('request-id', requestId)
        }) : Promise.resolve()
      ])

      // Log response asynchronously (don't wait)
      logger.logResponse(requestId, finalResponse, originalFormat).catch(console.error)

      return c.json(finalResponse)
    }

    // Streaming response - parallel setup
    const [stream] = await Promise.all([
      Promise.resolve(originalFormat === 'anthropic'
        ? transformStream(response as AsyncIterable<any>, payload.model)
        : response as AsyncIterable<any>),
      // Set headers in parallel
      originalFormat === 'anthropic' ? Promise.resolve().then(() => {
        c.header('anthropic-version', '2023-06-01')
        c.header('anthropic-beta', 'messages-2023-12-15')
        c.header('request-id', requestId)
      }) : Promise.resolve()
    ])

    return streamSSE(c, async (streamWriter) => {
      for await (const event of stream) {
        // Handle different event formats
        if (originalFormat === 'anthropic') {
          // Anthropic format: {event: "content_block_delta", data: "..."}
          await streamWriter.writeSSE({
            event: event.event,
            data: event.data
          })
        } else {
          // OpenAI format: {data: "..."}
          await streamWriter.writeSSE({
            data: event.data
          })
        }
      }
    })

  } catch (error) {
    // Log error asynchronously (don't block error response)
    logger.logError(requestId, error, originalFormat).catch(console.error)
    throw error
  }
}

