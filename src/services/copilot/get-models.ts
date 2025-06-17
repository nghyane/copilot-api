import { copilotBaseUrl, copilotHeaders, getCopilotAgent } from "~/lib/api-config"
import { HTTPError } from "~/lib/http-error"
import { state } from "~/lib/state"

// Cache for models with 5-minute TTL
let modelsCache: ModelsResponse | null = null
let modelsCacheExpiry = 0
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

export const getModels = async (): Promise<ModelsResponse> => {
  const now = Date.now()
  
  // Return cached models if still valid
  if (modelsCache && now < modelsCacheExpiry) {
    return modelsCache
  }

  const response = await fetch(`${copilotBaseUrl(state)}/models`, {
    headers: copilotHeaders(state),
    // @ts-ignore - Bun supports agent option
    agent: getCopilotAgent(),
  })

  if (!response.ok) throw new HTTPError("Failed to get models", response)

  const models = (await response.json()) as ModelsResponse
  
  // Update cache
  modelsCache = models
  modelsCacheExpiry = now + CACHE_DURATION
  
  return models
}

// Clear cache manually if needed
export const clearModelsCache = () => {
  modelsCache = null
  modelsCacheExpiry = 0
}

export interface ModelsResponse {
  data: Array<Model>
  object: string
}

interface ModelLimits {
  max_context_window_tokens?: number
  max_output_tokens?: number
  max_prompt_tokens?: number
  max_inputs?: number
}

interface ModelSupports {
  tool_calls?: boolean
  parallel_tool_calls?: boolean
  dimensions?: boolean
}

interface ModelCapabilities {
  family: string
  limits: ModelLimits
  object: string
  supports: ModelSupports
  tokenizer: string
  type: string
}

interface Model {
  capabilities: ModelCapabilities
  id: string
  model_picker_enabled: boolean
  name: string
  object: string
  preview: boolean
  vendor: string
  version: string
  policy?: {
    state: string
    terms: string
  }
}
