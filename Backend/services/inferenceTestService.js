import { config } from '../config/env.js'

const PROVIDER_DEFINITIONS = [
  {
    id: 'openrouter',
    name: 'OpenRouter',
    getApiKey: () => config.llm.openRouter.apiKey,
    getDefaultModel: () => config.llm.openRouter.model,
    models: [
      'qwen/qwen3-8b',
      'meta-llama/llama-3.1-8b-instruct',
      'google/gemini-2.0-flash-001',
      'mistralai/mistral-small-3.1-24b-instruct:free',
    ],
    url: 'https://openrouter.ai/api/v1/chat/completions',
    extraHeaders: () => ({
      'HTTP-Referer': config.cors.origin,
      'X-Title': 'ShopAI',
    }),
  },
  {
    id: 'gemini',
    name: 'Gemini',
    getApiKey: () => config.llm.gemini.apiKey,
    getDefaultModel: () => config.llm.gemini.model,
    models: ['gemini-2.0-flash', 'gemini-2.5-flash', 'gemini-1.5-flash'],
    url: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
  },
  {
    id: 'mistral',
    name: 'Mistral',
    getApiKey: () => config.llm.mistral.apiKey,
    getDefaultModel: () => config.llm.mistral.model,
    models: ['mistral-small-latest', 'mistral-medium-latest', 'open-mistral-nemo'],
    url: 'https://api.mistral.ai/v1/chat/completions',
  },
  {
    id: 'huggingface',
    name: 'HuggingFace',
    getApiKey: () => config.llm.huggingFace.apiKey,
    getDefaultModel: () => config.llm.huggingFace.model,
    models: [
      'Qwen/Qwen2.5-7B-Instruct',
      'meta-llama/Meta-Llama-3-8B-Instruct',
      'mistralai/Mistral-7B-Instruct-v0.3',
    ],
    url: 'https://router.huggingface.co/v1/chat/completions',
  },
  {
    id: 'groq',
    name: 'Groq',
    getApiKey: () => config.llm.groq.apiKey,
    getDefaultModel: () => config.llm.groq.model,
    models: ['llama-3.1-8b-instant', 'llama-3.3-70b-versatile', 'mixtral-8x7b-32768'],
    url: 'https://api.groq.com/openai/v1/chat/completions',
  },
  {
    id: 'cloudflare',
    name: 'Cloudflare Workers AI',
    getApiKey: () => config.llm.cloudflare.apiToken,
    isConfigured: () =>
      Boolean(config.llm.cloudflare.apiToken && config.llm.cloudflare.accountId),
    getDefaultModel: () => config.llm.cloudflare.model,
    models: [
      '@cf/meta/llama-3.1-8b-instruct',
      '@cf/mistral/mistral-7b-instruct-v0.2',
      '@cf/google/gemma-7b-it',
      '@cf/qwen/qwen1.5-14b-chat-awq',
    ],
    buildUrl: () =>
      `https://api.cloudflare.com/client/v4/accounts/${config.llm.cloudflare.accountId}/ai/v1/chat/completions`,
  },
]

function uniqueModels(defaultModel, models) {
  const seen = new Set()
  const out = []
  for (const model of [defaultModel, ...models]) {
    const value = String(model || '').trim()
    if (!value || seen.has(value)) continue
    seen.add(value)
    out.push(value)
  }
  return out
}

function findProvider(providerId) {
  return PROVIDER_DEFINITIONS.find((p) => p.id === providerId) || null
}

function providerConfigured(provider) {
  if (provider.isConfigured) return provider.isConfigured()
  return Boolean(provider.getApiKey())
}

function providerUrl(provider) {
  if (provider.buildUrl) return provider.buildUrl()
  return provider.url
}

function extractErrorDetail(data, status) {
  if (data?.errors?.length) {
    return data.errors.map((e) => e.message || JSON.stringify(e)).join('; ')
  }
  return (
    data?.error?.message ||
    data?.message ||
    (typeof data?.error === 'string' ? data.error : '') ||
    `HTTP ${status}`
  )
}

export function listInferenceProviders() {
  return PROVIDER_DEFINITIONS.map((provider) => ({
    id: provider.id,
    name: provider.name,
    configured: providerConfigured(provider),
    defaultModel: provider.getDefaultModel(),
    models: uniqueModels(provider.getDefaultModel(), provider.models),
  }))
}

export async function testInferenceProvider(providerId, model) {
  const provider = findProvider(providerId)
  if (!provider) {
    return { ok: false, status: 'error', error: 'Unknown provider' }
  }

  if (!providerConfigured(provider)) {
    const missing =
      provider.id === 'cloudflare'
        ? 'Cloudflare account ID and API token not configured'
        : 'API key not configured'
    return { ok: false, status: 'not_configured', error: missing }
  }

  const apiKey = provider.getApiKey()
  const useModel = String(model || provider.getDefaultModel()).trim()
  if (!useModel) {
    return { ok: false, status: 'error', error: 'Model is required' }
  }

  const extraHeaders = provider.extraHeaders ? provider.extraHeaders() : {}

  try {
    const response = await fetch(providerUrl(provider), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        ...extraHeaders,
      },
      body: JSON.stringify({
        model: useModel,
        messages: [{ role: 'user', content: 'Hi' }],
        temperature: 0.2,
        max_tokens: 32,
      }),
    })

    const data = await response.json().catch(() => ({}))

    if (!response.ok) {
      return {
        ok: false,
        status: 'not_working',
        error: extractErrorDetail(data, response.status),
        model: useModel,
      }
    }

    const content = data?.choices?.[0]?.message?.content?.trim() || ''
    if (!content) {
      return {
        ok: false,
        status: 'not_working',
        error: 'Empty response from provider',
        model: useModel,
      }
    }

    return {
      ok: true,
      status: 'working',
      model: useModel,
      response: content.slice(0, 160),
    }
  } catch (err) {
    return {
      ok: false,
      status: 'not_working',
      error: err.message || 'Request failed',
      model: useModel,
    }
  }
}
