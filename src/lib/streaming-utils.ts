import { events } from "fetch-event-stream"


export async function* createStreamingResponse(
  response: Response,
): AsyncIterable<any> {
  const eventStream = events(response, {
    retry: false, // Disable auto-retry for better control
  })

  for await (const event of eventStream) {
    // Skip keep-alive or empty events
    if (!event.data || event.data === '[DONE]' || event.data.trim() === '') continue
    
    yield event
  }
}


