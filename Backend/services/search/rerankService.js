import { config } from '../../config/env.js'

async function rerankVoyage(query, documents, topN, model) {
  const res = await fetch('https://api.voyageai.com/v1/rerank', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.search.voyageApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, documents, model, top_k: topN }),
  })
  if (!res.ok) throw new Error(`Voyage rerank HTTP ${res.status}`)
  const data = await res.json()
  return data.data.map((row) => ({ index: row.index, score: row.relevance_score }))
}

async function rerankJina(query, documents, topN, model) {
  const res = await fetch('https://api.jina.ai/v1/rerank', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.search.jinaApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, documents, model, top_n: topN }),
  })
  if (!res.ok) throw new Error(`Jina rerank HTTP ${res.status}`)
  const data = await res.json()
  return data.results.map((row) => ({ index: row.index, score: row.relevance_score }))
}

async function rerankCohere(query, documents, topN, model) {
  const res = await fetch('https://api.cohere.com/v2/rerank', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.search.cohereApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      query,
      documents: documents.map((text) => ({ text })),
      top_n: topN,
    }),
  })
  if (!res.ok) throw new Error(`Cohere rerank HTTP ${res.status}`)
  const data = await res.json()
  return data.results.map((row) => ({ index: row.index, score: row.relevance_score }))
}

async function rerankOpenRouter(query, documents, topN, model) {
  const res = await fetch('https://openrouter.ai/api/v1/rerank', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.llm.openRouter.apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': config.cors.origin,
      'X-Title': 'ShopAI',
    },
    body: JSON.stringify({ model, query, documents, top_n: topN }),
  })
  if (!res.ok) throw new Error(`OpenRouter rerank HTTP ${res.status}`)
  const data = await res.json()
  return (data.results || []).map((row) => ({
    index: row.index,
    score: row.relevance_score ?? row.score ?? 0,
  }))
}

const providerFns = {
  voyage: () => ({
    name: 'Voyage',
    ready: () => Boolean(config.search.voyageApiKey),
    rerank: (q, docs, n) => rerankVoyage(q, docs, n, config.search.rerank.model),
  }),
  jina: () => ({
    name: 'Jina',
    ready: () => Boolean(config.search.jinaApiKey),
    rerank: (q, docs, n) => rerankJina(q, docs, n, config.search.rerank.jinaModel),
  }),
  cohere: () => ({
    name: 'Cohere',
    ready: () => Boolean(config.search.cohereApiKey),
    rerank: (q, docs, n) => rerankCohere(q, docs, n, config.search.rerank.cohereModel),
  }),
  openrouter: () => ({
    name: 'OpenRouter',
    ready: () => Boolean(config.llm.openRouter.apiKey),
    rerank: (q, docs, n) => rerankOpenRouter(q, docs, n, config.search.rerank.openRouterModel),
  }),
}

function orderedProviders() {
  const primary = config.search.rerank.provider?.toLowerCase() || 'voyage'
  const order = [primary, 'voyage', 'jina', 'cohere', 'openrouter']
  const seen = new Set()
  return order.filter((p) => {
    if (seen.has(p)) return false
    seen.add(p)
    return providerFns[p]
  })
}

const RERANK_MIN_SCORE = 0.28
const RERANK_RELATIVE_TO_TOP = 0.5

export function filterRerankResults(results, { minScore = RERANK_MIN_SCORE, relativeToTop = RERANK_RELATIVE_TO_TOP } = {}) {
  if (!results?.length) return []
  const sorted = [...results].sort((a, b) => b.score - a.score)
  const top = sorted[0]?.score ?? 0
  return sorted.filter((row, i) => {
    if (row.score < minScore) return false
    if (i > 0 && top > 0 && row.score < top * relativeToTop) return false
    return true
  })
}

/**
 * @returns {{ index: number, score: number }[]|null} Relevance-scored rerank rows, or null if skipped/failed
 */
export async function rerankDocuments(query, documents, topN) {
  if (!config.search.rerank.enabled || !query?.trim() || !documents?.length) {
    return null
  }

  const limit = Math.min(topN || config.search.rerank.topN, documents.length)
  let lastError = null

  for (const id of orderedProviders()) {
    const provider = providerFns[id]()
    if (!provider.ready()) continue
    try {
      const results = await provider.rerank(query.trim(), documents, limit)
      return filterRerankResults(results)
    } catch (err) {
      lastError = err
      console.warn(`[rerank] ${provider.name} failed:`, err.message)
    }
  }

  if (lastError) console.warn('[rerank] all providers failed, using RRF order')
  return null
}
