import Product from '../../model/Product.js'
import { config } from '../../config/env.js'
import { indexProductEmbedding } from './vectorIndexService.js'

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
 */
export async function syncMissingProductEmbeddings(options = {}) {
  const {
    delayMs = config.search.syncDelayMs,
    maxProducts = config.search.syncMaxPerRun,
  } = options

  const spec = getEmbeddingSpec()
  const candidates = await Product.find({})
    .select('_id name embedding embeddedAt embeddingVersion embeddingModel')
    .lean()

  const pending = candidates.filter((p) => productNeedsEmbedding(p, spec))
  const toProcess = maxProducts > 0 ? pending.slice(0, maxProducts) : pending

  if (toProcess.length === 0) {
    return { total: candidates.length, pending: 0, indexed: 0, failed: 0 }
  }

  console.log(
    `[search] Auto-sync: indexing ${toProcess.length} product(s) (missing or stale embeddings)`
  )

  let indexed = 0
  let failed = 0

  for (const p of toProcess) {
    const result = await indexProductEmbedding(p._id)
    if (result.ok) indexed += 1
    else failed += 1

    if (delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs))
    }
  }

  console.log(`[search] Auto-sync done: ${indexed} ok, ${failed} failed`)
  return {
    total: candidates.length,
    pending: pending.length,
    indexed,
    failed,
  }
}

let syncInProgress = false

/**
 * Fire-and-forget startup sync (does not block HTTP server).
 */
export function scheduleEmbeddingSyncOnStartup() {
  if (!config.search.autoSyncEmbeddings) return
  if (config.isTest) return

  setTimeout(async () => {
    if (syncInProgress) return
    syncInProgress = true
    try {
      await syncMissingProductEmbeddings()
    } catch (err) {
      console.error('[search] Auto-sync failed:', err.message)
    } finally {
      syncInProgress = false
    }
  }, config.search.syncStartupDelayMs)
}
