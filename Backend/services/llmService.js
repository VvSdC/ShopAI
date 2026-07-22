import logger from '../utils/logger.js'
import { config } from '../config/env.js'
import { LLM_MAX_TOKENS_DEFAULT } from '../constants/chatLimits.js'
import { callGeminiChat } from './geminiClient.js'
import { recordLlmUsage } from './llmUsageLogger.js'
import { parseOpenAiSseStream } from './chatStream.js'

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

const ROLE_ALLOWED_KEYS = {
  system: ['role', 'content'],
  user: ['role', 'content', 'name'],
  assistant: ['role', 'content', 'tool_calls', 'name'],
  tool: ['role', 'content', 'tool_call_id', 'name'],
}

/** Strip provider-specific fields (reasoning, refusal, …) that break OpenAI-compatible APIs. */
export function sanitizeMessagesForLlmApi(messages) {
  return (Array.isArray(messages) ? messages : []).map((msg) => {
    if (!msg || typeof msg !== 'object') return msg
    const allowed = ROLE_ALLOWED_KEYS[msg.role] || ['role', 'content']
    const out = {}
    for (const key of allowed) {
      if (msg[key] !== undefined) out[key] = msg[key]
    }
    if (msg.role === 'assistant' && out.tool_calls?.length && out.content === undefined) {
      out.content = null
    }
    return out
  })
}

async function callProvider(provider, messages, tools, maxTokens) {
  const apiKey = provider.key()
  if (!apiKey) {
    throw new Error(`${provider.name} API key not configured`)
  }

  const model = provider.model()
  const startedAt = Date.now()
  const safeMessages = sanitizeMessagesForLlmApi(messages)

  if (provider.name === 'Gemini') {
    const result = await callGeminiChat(safeMessages, {
      model,
      maxTokens,
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
      errorType: result.status === 429 ? 'rate_limit' : 'api_error',
      errorMessage: String(result.error || '').slice(0, 500) || null,
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
    messages: safeMessages,
    temperature: 0.7,
    max_tokens: maxTokens,
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
      errorType: response.status === 429 ? 'rate_limit' : `http_${response.status}`,
      errorMessage: String(text).slice(0, 500) || null,
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

export async function chatCompletion(messages, tools, options = {}) {
  const maxTokens = options.maxTokens ?? LLM_MAX_TOKENS_DEFAULT
  let lastError = null

  for (const provider of providers) {
    try {
      if (!providerReady(provider)) continue
      const result = await callProvider(provider, messages, tools, maxTokens)
      return result
    } catch (err) {
      lastError = err
      if (err.isRateLimit) {
        logger.warn(`${provider.name} rate limited, falling back...`)
        continue
      }
      logger.error(`${provider.name} failed:`, err.message)
      continue
    }
  }

  throw lastError || new Error('All LLM providers failed or are unconfigured')
}

async function* streamOpenAiCompatibleProvider(provider, messages, tools, maxTokens) {
  const apiKey = provider.key()
  if (!apiKey) {
    throw new Error(`${provider.name} API key not configured`)
  }

  const model = provider.model()
  const startedAt = Date.now()
  const safeMessages = sanitizeMessagesForLlmApi(messages)
  const url = typeof provider.url === 'function' ? provider.url() : provider.url

  const body = {
    model,
    messages: safeMessages,
    temperature: 0.7,
    max_tokens: maxTokens,
    stream: true,
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
      errorType: response.status === 429 ? 'rate_limit' : `http_${response.status}`,
      errorMessage: String(text).slice(0, 500) || null,
    })
    throw new Error(`${provider.name} stream error (${response.status}): ${text}`)
  }

  const chunks = []
  for await (const chunk of parseOpenAiSseStream(response)) {
    chunks.push(chunk)
    yield chunk
  }

  recordLlmUsage({
    provider: provider.name,
    model,
    responseData: chunks[chunks.length - 1] || null,
    latencyMs: Date.now() - startedAt,
    success: true,
  })
}

async function* streamGeminiProvider(messages, tools, maxTokens) {
  const apiKey = config.llm.gemini.apiKey
  if (!apiKey) {
    throw new Error('Gemini API key not configured')
  }

  const model = config.llm.gemini.model
  const startedAt = Date.now()
  const safeMessages = sanitizeMessagesForLlmApi(messages)
  const body = {
    model,
    messages: safeMessages,
    temperature: 0.7,
    max_tokens: maxTokens,
    stream: true,
  }

  if (tools && tools.length > 0) {
    body.tools = tools
    body.tool_choice = 'auto'
  }

  const response = await fetch(
    'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify(body),
    }
  )

  if (response.status === 429) {
    const err = new Error('Gemini rate limited')
    err.isRateLimit = true
    throw err
  }

  if (!response.ok) {
    const text = await response.text().catch(() => 'Unknown error')
    recordLlmUsage({
      provider: 'Gemini',
      model,
      responseData: null,
      latencyMs: Date.now() - startedAt,
      success: false,
      errorType: response.status === 429 ? 'rate_limit' : `http_${response.status}`,
      errorMessage: String(text).slice(0, 500) || null,
    })
    throw new Error(`Gemini stream error (${response.status}): ${text}`)
  }

  const chunks = []
  for await (const chunk of parseOpenAiSseStream(response)) {
    chunks.push(chunk)
    yield chunk
  }

  recordLlmUsage({
    provider: 'Gemini',
    model,
    responseData: chunks[chunks.length - 1] || null,
    latencyMs: Date.now() - startedAt,
    success: true,
  })
}

/** Async generator — yields OpenAI-compatible stream chunks with provider fallback. */
export async function* streamChatCompletion(messages, tools, options = {}) {
  const maxTokens = options.maxTokens ?? LLM_MAX_TOKENS_DEFAULT
  let lastError = null

  for (const provider of providers) {
    try {
      if (!providerReady(provider)) continue

      if (provider.name === 'Gemini') {
        yield* streamGeminiProvider(messages, tools, maxTokens)
        return
      }

      yield* streamOpenAiCompatibleProvider(provider, messages, tools, maxTokens)
      return
    } catch (err) {
      lastError = err
      if (err.isRateLimit) {
        logger.warn(`${provider.name} stream rate limited, falling back...`)
        continue
      }
      logger.warn(`${provider.name} stream failed:`, err.message)
      continue
    }
  }

  throw lastError || new Error('All LLM providers failed or are unconfigured')
}
