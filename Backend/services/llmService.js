import dotenv from 'dotenv'
dotenv.config()

const providers = [
  {
    name: 'Cerebras',
    url: 'https://api.cerebras.ai/v1/chat/completions',
    key: () => process.env.CEREBRAS_API_KEY,
    model: () => process.env.CEREBRAS_MODEL || 'qwen-3-8b',
  },
  {
    name: 'HuggingFace',
    url: () => {
      const model = process.env.HUGGINGFACE_MODEL || 'Qwen/Qwen2.5-7B-Instruct'
      return `https://api-inference.huggingface.co/models/${model}/v1/chat/completions`
    },
    key: () => process.env.HUGGINGFACE_API_KEY,
    model: () => process.env.HUGGINGFACE_MODEL || 'Qwen/Qwen2.5-7B-Instruct',
  },
  {
    name: 'OpenRouter',
    url: 'https://openrouter.ai/api/v1/chat/completions',
    key: () => process.env.OPENROUTER_API_KEY,
    model: () => process.env.OPENROUTER_MODEL || 'qwen/qwen3-8b',
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
    max_tokens: 1024,
  }

  if (tools && tools.length > 0) {
    body.tools = tools
    body.tool_choice = 'auto'
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
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
    throw new Error(`${provider.name} error (${response.status}): ${text}`)
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
