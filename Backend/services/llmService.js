import dotenv from 'dotenv'
dotenv.config()

/**
 * Fallback order: OpenRouter → Gemini → Mistral → HuggingFace (router).
 * Skips providers without an API key. Retries next on rate limits or errors.
 */
const providers = [
  {
    name: 'OpenRouter',
    url: 'https://openrouter.ai/api/v1/chat/completions',
    key: () => process.env.OPENROUTER_API_KEY,
    model: () => process.env.OPENROUTER_MODEL || 'qwen/qwen3-8b',
    headers: () => ({
      'HTTP-Referer': process.env.FRONTEND_URL || 'http://localhost:3000',
      'X-Title': 'ShopAI',
    }),
  },
  {
    name: 'Gemini',
    url: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
    key: () => process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY,
    model: () => process.env.GEMINI_MODEL || 'gemini-2.0-flash',
  },
  {
    name: 'Mistral',
    url: 'https://api.mistral.ai/v1/chat/completions',
    key: () => process.env.MISTRAL_API_KEY,
    model: () => process.env.MISTRAL_MODEL || 'mistral-small-latest',
  },
  {
    name: 'HuggingFace',
    // Legacy api-inference.huggingface.co is decommissioned for chat; use the router.
    url: 'https://router.huggingface.co/v1/chat/completions',
    key: () => process.env.HUGGINGFACE_API_KEY,
    model: () => process.env.HUGGINGFACE_MODEL || 'Qwen/Qwen2.5-7B-Instruct',
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
