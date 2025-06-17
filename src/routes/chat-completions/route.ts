import { Hono } from "hono"

import { forwardError } from "~/lib/forward-error"

import { handleCompletion } from "./handler"

export const completionRoutes = new Hono()

completionRoutes.post("/", async (c) => {
  return await handleCompletion(c).catch((error) => {
    return forwardError(c, error)
  })
})
