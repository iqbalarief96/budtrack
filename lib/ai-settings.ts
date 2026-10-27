/**
 * Single source of truth for turning a user's stored AI settings into the
 * params `generateAIResponse` needs.
 *
 * Previously most AI call sites hand-rolled `{ provider, apiKey, model }` and
 * forgot `customEndpoint`, so every feature failed for users on a Custom
 * Endpoint (lib/ai.ts throws "Custom endpoint is required") and silently fell
 * back to non-AI output. They also ignored the per-provider key columns.
 * This mirrors the chatbot's (correct) resolution logic.
 */

type StoredAISettings = {
  provider?: string | null
  apiKey?: string | null
  deepseekApiKey?: string | null
  openrouterApiKey?: string | null
  zaiApiKey?: string | null
  customApiKey?: string | null
  customEndpoint?: string | null
  selectedModel?: string | null
} | null | undefined

export type ResolvedAIConfig = {
  provider: string
  apiKey: string
  model: string
  customEndpoint: string | null
}

/** The API key for the active provider (per-provider column, then legacy `apiKey`). */
export function resolveProviderApiKey(settings: StoredAISettings): string | null {
  if (!settings) return null
  const provider = (settings.provider || '').toLowerCase()
  const key =
    provider === 'deepseek' ? settings.deepseekApiKey || settings.apiKey
    : provider === 'openrouter' ? settings.openrouterApiKey || settings.apiKey
    : provider === 'zai' ? settings.zaiApiKey || settings.apiKey
    : provider === 'custom' ? settings.customApiKey || settings.apiKey
    : settings.apiKey
  return key || null
}

/**
 * Resolve the AI params from stored settings, or `null` if AI isn't usable
 * (no provider / key / model, or provider is custom without an endpoint).
 * `defaults` lets a call site keep its existing fallbacks.
 */
export function resolveAIConfig(
  settings: StoredAISettings,
  defaults: { provider?: string; model?: string } = {}
): ResolvedAIConfig | null {
  const provider = settings?.provider || defaults.provider || ''
  const effective = settings ? { ...settings, provider } : { provider }
  const apiKey = resolveProviderApiKey(effective)
  const model = settings?.selectedModel || defaults.model || ''
  const customEndpoint = provider.toLowerCase() === 'custom' ? settings?.customEndpoint?.trim() || null : null

  if (!provider || !apiKey || !model) return null
  if (provider.toLowerCase() === 'custom' && !customEndpoint) return null

  return { provider, apiKey, model, customEndpoint }
}
