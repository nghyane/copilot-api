import { copilotHeaders, copilotBaseUrl, getCopilotAgent } from "~/lib/api-config"
import { HTTPError } from "~/lib/http-error"
import { state } from "~/lib/state"
import { createStreamingResponse } from "~/lib/streaming-utils"

export const createChatCompletions = async (
  payload: any,
): Promise<any | AsyncIterable<any>> => {
  if (!state.copilotToken) throw new Error("Copilot token not found")

  // Simple vision detection
  const hasVision = payload.messages?.some((msg: any) =>
    Array.isArray(msg.content) && msg.content.some((part: any) =>
      part.type === "image_url" || part.type === "image"
    )
  )

  const response = await fetch(`${copilotBaseUrl(state)}/chat/completions`, {
    method: "POST",
    headers: copilotHeaders(state, hasVision),
    body: JSON.stringify(payload),
    // @ts-ignore - Bun supports agent option
    agent: getCopilotAgent(),
  })

  if (!response.ok) {
    throw new HTTPError(`Failed to create chat completions: ${await response.text()}`, response)
  }

  return payload.stream ? createStreamingResponse(response) : response.json()
}
