import { config } from '../config/env.js'

/**
 * Fallback order: OpenRouter → Gemini → Mistral → HuggingFace (router).
 * Skips providers without an API key. Retries next on rate limits or errors.
 */
const providers = [
  {
    name: 'OpenRouter',
    url: 'https://openrouter.ai/api/v1/chat/completions',
    key: () => config.llm.openRouter.apiKey,
    model: () => config.llm.openRouter.model,
    headers: () => ({
      'HTTP-Referer': config.cors.origin,
      'X-Title': 'ShopAI',
    }),
  },
  {
    name: 'Gemini',
    url: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
    key: () => config.llm.gemini.apiKey,
    model: () => config.llm.gemini.model,
  },
  {
    name: 'Mistral',
    url: 'https://api.mistral.ai/v1/chat/completions',
    key: () => config.llm.mistral.apiKey,
    model: () => config.llm.mistral.model,
  },
  {
    name: 'HuggingFace',
    url: 'https://router.huggingface.co/v1/chat/completions',
    key: () => config.llm.huggingFace.apiKey,
    model: () => config.llm.huggingFace.model,
  },
]

async function callProvider(provider, messages, tools) {
  const apiKey = provider.key()
  if (!apiKey) {
    throw new Error(`${provider.name} API key not configured`)
  }

  const url = typeof provider.url === 'function' ? provider.url() : provider.url
  const model = provider.model()

  const body = {
    model,
    messages,
    temperature: 0.7,
    max_tokens: 2048,
  }

  if (tools && tools.length > 0) {
    body.tools = tools
    body.tool_choice = 'auto'
  }

  const extraHeaders = provider.headers ? provider.headers() : {}

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      ...extraHeaders,
    },
    body: JSON.stringify(body),
  })

  if (response.status === 429) {
    const err = new Error(`${provider.name} rate limited`)
    err.isRateLimit = true
    throw err
  }

  if (!response.ok) {
    const text = await response.text().catch(() => 'Unknown error')
    const hint =
      provider.name === 'HuggingFace' && response.status === 410
        ? ' (old inference endpoint — ensure HUGGINGFACE uses router.huggingface.co)'
        : provider.name === 'HuggingFace' && text.includes('model')
          ? ' (check HUGGINGFACE_MODEL spelling or router availability)'
          : ''
    throw new Error(`${provider.name} error (${response.status}): ${text}${hint}`)
  }

  const data = await response.json()
  return data
}

export async function chatCompletion(messages, tools) {
  let lastError = null

  for (const provider of providers) {
    try {
      if (!provider.key()) continue
      const result = await callProvider(provider, messages, tools)
      return result
    } catch (err) {
      lastError = err
      if (err.isRateLimit) {
        console.warn(`${provider.name} rate limited, falling back...`)
        continue
      }
      console.error(`${provider.name} failed:`, err.message)
      continue
    }
  }

  throw lastError || new Error('All LLM providers failed or are unconfigured')
}
