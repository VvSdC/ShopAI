/**
 * Approximate USD pricing per 1K tokens for the providers/models ShopAI uses.
 *
 * These are best-effort estimates for internal cost telemetry — not billing.
 * Update as vendors change pricing. Free-tier models are recorded as $0 so
 * we can distinguish "using paid plan" from "using free plan" in analytics.
 *
 * Prices are per 1,000 tokens (input / output).
 */

/** Fallback prices when no exact model match is found (per provider). */
const PROVIDER_DEFAULT_PRICING = {
  openrouter: { input: 0.0005, output: 0.0015 },
  gemini: { input: 0.000075, output: 0.0003 },
  mistral: { input: 0.0002, output: 0.0006 },
  huggingface: { input: 0, output: 0 },
  groq: { input: 0.00005, output: 0.00008 },
  router: { input: 0, output: 0 }, // synthetic route-decision rows
  unknown: { input: 0, output: 0 },
}

/**
 * Model-level overrides. Keys are lowercase, matched by suffix
 * (so `openai/gpt-4o-mini` matches an override for `gpt-4o-mini`).
 */
const MODEL_PRICING = {
  // OpenAI-family via OpenRouter
  'gpt-4o': { input: 0.005, output: 0.015 },
  'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
  'gpt-4-turbo': { input: 0.01, output: 0.03 },
  'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 },

  // Anthropic via OpenRouter
  'claude-3-5-sonnet': { input: 0.003, output: 0.015 },
  'claude-3-haiku': { input: 0.00025, output: 0.00125 },
  'claude-3-opus': { input: 0.015, output: 0.075 },

  // Google Gemini
  'gemini-2.0-flash': { input: 0.000075, output: 0.0003 },
  'gemini-2.5-flash': { input: 0.000075, output: 0.0003 },
  'gemini-1.5-flash': { input: 0.000075, output: 0.0003 },
  'gemini-1.5-pro': { input: 0.00125, output: 0.005 },

  // Mistral hosted
  'mistral-small-latest': { input: 0.0002, output: 0.0006 },
  'mistral-medium-latest': { input: 0.00275, output: 0.00825 },
  'open-mistral-nemo': { input: 0.00015, output: 0.00015 },

  // Groq (input/output roughly the same)
  'llama-3.1-8b-instant': { input: 0.00005, output: 0.00008 },
  'llama-3.3-70b-versatile': { input: 0.00059, output: 0.00079 },
  'mixtral-8x7b-32768': { input: 0.00024, output: 0.00024 },

  // Free-tier / community fallback via OpenRouter
  'qwen/qwen3-8b': { input: 0, output: 0 },
  'mistralai/mistral-small-3.1-24b-instruct:free': { input: 0, output: 0 },
}

function normalize(value) {
  return String(value || '').trim().toLowerCase()
}

function findModelPricing(model) {
  if (!model) return null
  const key = normalize(model)

  if (MODEL_PRICING[key]) return MODEL_PRICING[key]

  // Match suffix (e.g. openai/gpt-4o-mini → gpt-4o-mini)
  for (const [modelKey, prices] of Object.entries(MODEL_PRICING)) {
    if (key.endsWith(modelKey)) return prices
  }
  return null
}

function findProviderPricing(provider) {
  if (!provider) return PROVIDER_DEFAULT_PRICING.unknown
  return PROVIDER_DEFAULT_PRICING[normalize(provider)] || PROVIDER_DEFAULT_PRICING.unknown
}

/**
 * @param {Object} params
 * @param {string} [params.provider]
 * @param {string} [params.model]
 * @param {number} [params.promptTokens]
 * @param {number} [params.completionTokens]
 * @returns {number} Estimated cost in USD (0 for free tiers or missing data).
 */
export function estimateLlmCostUsd({ provider, model, promptTokens = 0, completionTokens = 0 } = {}) {
  const modelPricing = findModelPricing(model)
  const pricing = modelPricing || findProviderPricing(provider)
  const cost =
    (Number(promptTokens) || 0) * (pricing.input / 1000) +
    (Number(completionTokens) || 0) * (pricing.output / 1000)
  return Math.max(0, Number(cost.toFixed(6)))
}

/** @returns {{ provider: string, model?: string, input: number, output: number }[]} */
export function listKnownPricing() {
  const rows = []
  for (const [provider, prices] of Object.entries(PROVIDER_DEFAULT_PRICING)) {
    rows.push({ provider, ...prices })
  }
  for (const [model, prices] of Object.entries(MODEL_PRICING)) {
    rows.push({ provider: 'model-override', model, ...prices })
  }
  return rows
}
