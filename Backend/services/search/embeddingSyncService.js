import Product from '../../model/Product.js'
import { config } from '../../config/env.js'
import { indexProductEmbedding } from './vectorIndexService.js'

const SYNC_BATCH_SIZE = 500

export function getEmbeddingSpec() {
  return {
    version: config.search.embeddingVersion,
    model: config.search.embedding.model,
    provider: config.search.embedding.provider,
  }
}

export function productNeedsEmbedding(product, spec = getEmbeddingSpec()) {
  if (!product?.embedding?.length) return true
  if (!product.embeddedAt) return true
  if (product.embeddingVersion !== spec.version) return true
  if (product.embeddingModel && product.embeddingModel !== spec.model) return true
  return false
}

/** Run async workers with a fixed concurrency cap (p-limit style, no extra dependency). */
export async function runWithConcurrencyLimit(items, concurrency, worker) {
  if (!items.length) return []

  const limit = Math.max(1, concurrency)
  const results = new Array(items.length)
  let nextIndex = 0

  async function runWorker() {
    while (true) {
      const idx = nextIndex++
      if (idx >= items.length) return
      results[idx] = await worker(items[idx], idx)
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, () => runWorker())
  )
  return results
}

/**
 * Index products that are missing or stale embeddings.
 * Scans with a cursor (batchSize 500), then indexes with a concurrency-limited pool.
 */
export async function syncMissingProductEmbeddings(options = {}) {
  const {
    concurrency = config.search.syncConcurrency,
    maxProducts = config.search.syncMaxPerRun,
  } = options

  const spec = getEmbeddingSpec()
  const total = await Product.countDocuments({})

  const toProcess = []
  let pending = 0

  const cursor = Product.find({})
    .select('_id name embedding embeddedAt embeddingVersion embeddingModel')
    .lean()
    .cursor({ batchSize: SYNC_BATCH_SIZE })

  for await (const product of cursor) {
    if (!productNeedsEmbedding(product, spec)) continue

    pending += 1
    if (maxProducts > 0 && toProcess.length >= maxProducts) continue
    toProcess.push(product._id)
  }

  if (toProcess.length === 0) {
    return { total, pending: 0, indexed: 0, failed: 0 }
  }

  const capNote = maxProducts > 0 ? ` (up to ${maxProducts} this run)` : ''
  console.log(
    `[search] Auto-sync: indexing ${toProcess.length} product(s) at concurrency ${concurrency}${capNote}`
  )

  const outcomes = await runWithConcurrencyLimit(toProcess, concurrency, async (productId) => {
    const result = await indexProductEmbedding(productId)
    return Boolean(result.ok)
  })

  const indexed = outcomes.filter(Boolean).length
  const failed = outcomes.length - indexed

  console.log(`[search] Auto-sync done: ${indexed} ok, ${failed} failed`)
  return {
    total,
    pending,
    indexed,
    failed,
  }
}
