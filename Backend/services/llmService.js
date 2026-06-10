import { config } from '../config/env.js'
import { callGeminiChat } from './geminiClient.js'
import { recordLlmUsage } from './llmUsageLogger.js'

/**
 * Fallback order: OpenRouter → Gemini → Mistral → HuggingFace → Groq.
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
  {
    name: 'Groq',
    url: 'https://api.groq.com/openai/v1/chat/completions',
    key: () => config.llm.groq.apiKey,
    model: () => config.llm.groq.model,
  },
]

function providerReady(provider) {
  return Boolean(provider.key())
}

async function callProvider(provider, messages, tools) {
  const apiKey = provider.key()
  if (!apiKey) {
    throw new Error(`${provider.name} API key not configured`)
  }

  const model = provider.model()
  const startedAt = Date.now()

  if (provider.name === 'Gemini') {
    const result = await callGeminiChat(messages, {
      model,
      maxTokens: 2048,
      temperature: 0.7,
      tools,
    })

    if (result.ok) {
      recordLlmUsage({
        provider: provider.name,
        model,
        responseData: result.data,
        latencyMs: Date.now() - startedAt,
        success: true,
      })
      return result.data
    }

    recordLlmUsage({
      provider: provider.name,
      model,
      responseData: null,
      latencyMs: Date.now() - startedAt,
      success: false,
    })

    if (result.status === 429) {
      const err = new Error(`Gemini rate limited: ${result.error}`)
      err.isRateLimit = true
      throw err
    }

    throw new Error(`Gemini error: ${result.error}`)
  }

  const url = typeof provider.url === 'function' ? provider.url() : provider.url

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
    recordLlmUsage({
      provider: provider.name,
      model,
      responseData: null,
      latencyMs: Date.now() - startedAt,
      success: false,
    })
    const hint =
      provider.name === 'HuggingFace' && response.status === 410
        ? ' (old inference endpoint — ensure HUGGINGFACE uses router.huggingface.co)'
        : provider.name === 'HuggingFace' && text.includes('model')
          ? ' (check HUGGINGFACE_MODEL spelling or router availability)'
          : ''
    throw new Error(`${provider.name} error (${response.status}): ${text}${hint}`)
  }

  const data = await response.json()
  recordLlmUsage({
    provider: provider.name,
    model,
    responseData: data,
    latencyMs: Date.now() - startedAt,
    success: true,
  })
  return data
}

export async function chatCompletion(messages, tools) {
  let lastError = null

  for (const provider of providers) {
    try {
      if (!providerReady(provider)) continue
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
