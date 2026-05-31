import { config } from '../../config/env.js'

function meanPool(tokenEmbeddings) {
  if (!Array.isArray(tokenEmbeddings) || tokenEmbeddings.length === 0) return []
  if (typeof tokenEmbeddings[0] === 'number') return tokenEmbeddings
  const dim = tokenEmbeddings[0].length
  const sum = new Array(dim).fill(0)
  for (const row of tokenEmbeddings) {
    for (let i = 0; i < dim; i++) sum[i] += row[i]
  }
  return sum.map((v) => v / tokenEmbeddings.length)
}

async function embedHuggingFace(text, model) {
  // Legacy api-inference.huggingface.co is retired (ENOTFOUND). Use Inference Providers router.
  const url = `https://router.huggingface.co/hf-inference/models/${model}/pipeline/feature-extraction`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.llm.huggingFace.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ inputs: text }),
  })
  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(`HuggingFace embed HTTP ${res.status}${detail ? `: ${detail.slice(0, 120)}` : ''}`)
  }
  const data = await res.json()
  return meanPool(data)
}

async function embedVoyage(text, model) {
  const res = await fetch('https://api.voyageai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.search.voyageApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ input: [text], model }),
  })
  if (!res.ok) throw new Error(`Voyage embed HTTP ${res.status}`)
  const data = await res.json()
  return data.data[0].embedding
}

async function embedJina(text, model) {
  const res = await fetch('https://api.jina.ai/v1/embeddings', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.search.jinaApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model, input: [text] }),
  })
  if (!res.ok) throw new Error(`Jina embed HTTP ${res.status}`)
  const data = await res.json()
  return data.data[0].embedding
}

async function embedGemini(text, model) {
  const key = config.llm.gemini.apiKey
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:embedContent?key=${key}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: { parts: [{ text }] } }),
    }
  )
  if (!res.ok) throw new Error(`Gemini embed HTTP ${res.status}`)
  const data = await res.json()
  return data.embedding.values
}

async function embedOpenRouter(text, model) {
  const res = await fetch('https://openrouter.ai/api/v1/embeddings', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.llm.openRouter.apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': config.cors.origin,
      'X-Title': 'ShopAI',
    },
    body: JSON.stringify({ model, input: text }),
  })
  if (!res.ok) throw new Error(`OpenRouter embed HTTP ${res.status}`)
  const data = await res.json()
  return data.data[0].embedding
}

const providerFns = {
  huggingface: () => ({
    name: 'HuggingFace',
    ready: () => Boolean(config.llm.huggingFace.apiKey),
    embed: (text) => embedHuggingFace(text, config.search.embedding.model),
  }),
  voyage: () => ({
    name: 'Voyage',
    ready: () => Boolean(config.search.voyageApiKey),
    embed: (text) => embedVoyage(text, config.search.embedding.voyageModel),
  }),
  jina: () => ({
    name: 'Jina',
    ready: () => Boolean(config.search.jinaApiKey),
    embed: (text) => embedJina(text, config.search.embedding.jinaModel),
  }),
  gemini: () => ({
    name: 'Gemini',
    ready: () => Boolean(config.llm.gemini.apiKey),
    embed: (text) => embedGemini(text, config.search.embedding.geminiModel),
  }),
  openrouter: () => ({
    name: 'OpenRouter',
    ready: () => Boolean(config.llm.openRouter.apiKey),
    embed: (text) => embedOpenRouter(text, config.search.embedding.openRouterModel),
  }),
}

function orderedProviders() {
  const primary = config.search.embedding.provider?.toLowerCase() || 'huggingface'
  const order = [primary, 'huggingface', 'voyage', 'jina', 'gemini', 'openrouter']
  const seen = new Set()
  return order.filter((p) => {
    if (seen.has(p)) return false
    seen.add(p)
    return providerFns[p]
  })
}

export async function embedText(text) {
  if (!text?.trim()) throw new Error('Empty text for embedding')

  let lastError = null
  for (const id of orderedProviders()) {
    const provider = providerFns[id]()
    if (!provider.ready()) continue
    try {
      const vector = await provider.embed(text.trim())
      if (!Array.isArray(vector) || vector.length === 0) {
        throw new Error('Empty embedding vector')
      }
      return { vector, provider: provider.name, model: config.search.embedding.model }
    } catch (err) {
      lastError = err
      console.warn(`[embed] ${provider.name} failed:`, err.message)
    }
  }
  throw lastError || new Error('No embedding provider configured')
}

export function cosineSimilarity(a, b) {
  if (!a?.length || !b?.length || a.length !== b.length) return 0
  let dot = 0
  let na = 0
  let nb = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    na += a[i] * a[i]
    nb += b[i] * b[i]
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb)
  return denom === 0 ? 0 : dot / denom
}
