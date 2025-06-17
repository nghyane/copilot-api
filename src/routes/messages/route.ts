import { Hono } from "hono"
import { handleCompletion } from "../chat-completions/handler"

export const messagesRoutes = new Hono()

// Anthropic Messages API endpoint
messagesRoutes.post("/", handleCompletion)
