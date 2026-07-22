import logger from '../../utils/logger.js'
import Product from '../../model/Product.js'
import { config } from '../../config/env.js'
import { indexProductEmbedding } from './vectorIndexService.js'

const SYNC_BATCH_SIZE = 500

export function getEmbeddingSpec() {
  return {
    version: config.search.embeddingVersion,
    model: config.search.embedding.model,
    provider: config.search.embedding.provider,
    dimension: config.search.embedding.dimension,
  }
}

export function getStoredEmbeddingDimension(product) {
  if (!product?.embedding?.length) return 0
  return product.embeddingDimension ?? product.embedding.length
}

export function productNeedsEmbedding(product, spec = getEmbeddingSpec()) {
  if (!product?.embedding?.length) return true
  if (!product.embeddedAt) return true
  if (product.embeddingVersion !== spec.version) return true
  if (product.embeddingModel && product.embeddingModel !== spec.model) return true
  if (getStoredEmbeddingDimension(product) !== spec.dimension) return true
  return false
}

/** Run async workers with a fixed concurrency cap (p-limit style, no extra dependency). */
export async function runWithConcurrencyLimit(items, concurrency, worker) {
  if (!items.length) return []

  const limit = Math.max(1, concurrency)
  const results = new Array(items.length)
  let nextIndex = 0

  async function runWorker() {
    for (;;) {
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
    .select('_id name embedding embeddedAt embeddingVersion embeddingModel embeddingDimension')
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
  logger.log(
    `[search] Auto-sync: indexing ${toProcess.length} product(s) at concurrency ${concurrency}${capNote}`
  )

  const outcomes = await runWithConcurrencyLimit(toProcess, concurrency, async (productId) => {
    const result = await indexProductEmbedding(productId)
    return Boolean(result.ok)
  })

  const indexed = outcomes.filter(Boolean).length
  const failed = outcomes.length - indexed

  logger.log(`[search] Auto-sync done: ${indexed} ok, ${failed} failed`)
  return {
    total,
    pending,
    indexed,
    failed,
  }
}

const MIGRATION_HINT =
  'Run `npm run search:reindex`, update ATLAS_VECTOR_INDEX numDimensions to match EMBEDDING_DIMENSION, and bump SEARCH_EMBEDDING_VERSION.'

function embeddingExistsFilter() {
  return { embedding: { $exists: true, $ne: [] } }
}

function dimensionMismatchFilter(expectedDim) {
  return {
    ...embeddingExistsFilter(),
    $or: [
      { embeddingDimension: { $exists: true, $ne: expectedDim } },
      {
        embeddingDimension: { $exists: false },
        $expr: { $ne: [{ $size: '$embedding' }, expectedDim] },
      },
    ],
  }
}

/** Count products whose stored vector length differs from configured EMBEDDING_DIMENSION. */
export async function countEmbeddingDimensionMismatches(expectedDim = getEmbeddingSpec().dimension) {
  return Product.countDocuments(dimensionMismatchFilter(expectedDim))
}

/**
 * Startup guard: detect stored embedding dimensions that disagree with config.
 * Returns { ok, status, expectedDim, storedDim?, mismatchCount?, migration? }.
 */
export async function checkEmbeddingDimensionCompatibility() {
  const expectedDim = getEmbeddingSpec().dimension
  const sample = await Product.findOne(embeddingExistsFilter())
    .select('embedding embeddingDimension embeddingVersion embeddingModel embeddingProvider')
    .lean()

  if (!sample) {
    return { ok: true, status: 'no_embeddings', expectedDim, storedDim: null, mismatchCount: 0 }
  }

  const storedDim = getStoredEmbeddingDimension(sample)
  const mismatchCount = await countEmbeddingDimensionMismatches(expectedDim)

  if (storedDim !== expectedDim || mismatchCount > 0) {
    return {
      ok: false,
      status: 'dimension_mismatch',
      expectedDim,
      storedDim,
      mismatchCount,
      embeddingVersion: sample.embeddingVersion ?? null,
      embeddingModel: sample.embeddingModel ?? null,
      embeddingProvider: sample.embeddingProvider ?? null,
      migration: MIGRATION_HINT,
    }
  }

  return { ok: true, status: 'compatible', expectedDim, storedDim, mismatchCount: 0 }
}

/** Log compatibility issues before auto-sync runs (non-blocking). */
export async function verifyEmbeddingDimensionOnStartup() {
  if (!config.search.autoSyncEmbeddings || config.isTest) {
    return { skipped: true }
  }

  try {
    const report = await checkEmbeddingDimensionCompatibility()

    if (report.status === 'no_embeddings') {
      logger.log(`[search] No product embeddings yet (expected ${report.expectedDim} dims)`)
      return report
    }

    if (!report.ok) {
      const message =
        `[search] Embedding dimension mismatch: configured=${report.expectedDim}, ` +
        `sample stored=${report.storedDim}, mismatched products=${report.mismatchCount}. ` +
        `${MIGRATION_HINT}`

      if (config.isProduction) {
        logger.error(message)
        throw new Error('Embedding dimension mismatch — run npm run search:reindex before deploy')
      }

      logger.warn(message)
      return report
    }

    logger.log(`[search] Embedding dimensions OK (${report.expectedDim})`)
    return report
  } catch (err) {
    logger.warn('[search] Embedding dimension check failed:', err.message)
    return { ok: false, status: 'check_failed', error: err.message }
  }
}
