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

/**
 * Index products that are missing or stale embeddings. Runs sequentially to respect API limits.
 * Scans the catalog with a cursor (batchSize 500) — never loads all products into memory.
 */
export async function syncMissingProductEmbeddings(options = {}) {
  const {
    delayMs = config.search.syncDelayMs,
    maxProducts = config.search.syncMaxPerRun,
  } = options

  const spec = getEmbeddingSpec()
  const total = await Product.countDocuments({})

  let pending = 0
  let indexed = 0
  let failed = 0
  let reachedProcessLimit = false
  let loggedStart = false

  const cursor = Product.find({})
    .select('_id name embedding embeddedAt embeddingVersion embeddingModel')
    .lean()
    .cursor({ batchSize: SYNC_BATCH_SIZE })

  for await (const product of cursor) {
    if (!productNeedsEmbedding(product, spec)) continue

    pending += 1

    if (reachedProcessLimit) continue

    if (maxProducts > 0 && indexed + failed >= maxProducts) {
      reachedProcessLimit = true
      continue
    }

    if (!loggedStart) {
      const capNote = maxProducts > 0 ? ` (up to ${maxProducts} this run)` : ''
      console.log(
        `[search] Auto-sync: indexing stale product embeddings${capNote}`
      )
      loggedStart = true
    }

    const result = await indexProductEmbedding(product._id)
    if (result.ok) indexed += 1
    else failed += 1

    if (delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs))
    }
  }

  if (pending === 0) {
    return { total, pending: 0, indexed: 0, failed: 0 }
  }

  console.log(`[search] Auto-sync done: ${indexed} ok, ${failed} failed`)
  return {
    total,
    pending,
    indexed,
    failed,
  }
}
