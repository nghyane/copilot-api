import { getModels } from "~/services/copilot/get-models"

import { state } from "./state"

/**
 * Transform disguised model names back to real Claude model names
 *
 * STRATEGY: Cursor sees "gpt-4-claude-sonnet-4" and sends OpenAI format,
 * but we need to map it back to real Claude model for GitHub Copilot API.
 */
export function transformModelName(modelName: string): string {

  // Pattern-based mappings for prefix matches
  const prefixMappings: Array<[string, string]> = [
    ["claude-sonnet-4-", "claude-sonnet-4"],
    ["claude-4-sonnet", "claude-sonnet-4"],
    ["claude-3-7-sonnet", "claude-3.7-sonnet"],
    ["claude-3-5-sonnet", "claude-3.5-sonnet"],
    ["gpt-4.1", "claude-sonnet-4"]
  ]

  for (const [prefix, target] of prefixMappings) {
    if (modelName.startsWith(prefix)) {
      return target
    }
  }

  return modelName
}

/**
 * Transform model name from internal format to client-facing format
 * Example: "claude-sonnet-4" -> "claude-4-sonnet"
 */
export function reverseTransformModelName(modelName: string): string {
  if (modelName === "claude-sonnet-4") {
    return "claude-4-sonnet"
  }

  return modelName
}

export async function cacheModels(): Promise<void> {
  const models = await getModels()
  state.models = models
}
