import logger from '../../utils/logger.js'
import Product from '../../model/Product.js'
import { config } from '../../config/env.js'
import { cosineSimilarity } from './embeddingService.js'

/** Display fields for search results — never includes embedding vectors. */
const PRODUCT_FIELDS =
  'name brand category price totalQty totalSold colors sizes images description tags searchDocument'

/** Dev-only fallback: keep low to avoid loading large embedding batches into Node.js. */
const LOCAL_COSINE_DEV_WARNING =
  '[vectorSearch] Local in-process cosine (dev/fallback) — set VECTOR_SEARCH_BACKEND=atlas with Atlas $vectorSearch in production.'

let autoBackendLogged = false

function inferVectorBackendFromUrl(mongoUrl) {
  return String(mongoUrl || '').includes('mongodb+srv://') ? 'atlas' : 'local'
}

/** Resolve effective vector search backend: atlas, local, or auto (URL inference). */
export function resolveVectorSearchBackend() {
  const configured = String(config.search.vectorBackend || 'auto').trim().toLowerCase()

  if (configured === 'atlas' || configured === 'local') {
    return configured
  }

  if (configured === 'auto') {
    const inferred = inferVectorBackendFromUrl(config.db.mongoUrl)
    if (!autoBackendLogged) {
      autoBackendLogged = true
      logger.log(
        `[vectorSearch] VECTOR_SEARCH_BACKEND=auto resolved to "${inferred}" — set atlas or local explicitly in production`
      )
    }
    return inferred
  }

  logger.warn(
    `[vectorSearch] Unknown VECTOR_SEARCH_BACKEND="${configured}" — using local cosine. Valid values: atlas, local, auto`
  )
  return 'local'
}

function localCandidateLimit(limit) {
  const scaled = Math.max(limit * 4, limit)
  return Math.min(
    scaled,
    config.search.vectorCandidates,
    config.search.localVectorCandidateCap
  )
}

function hasCatalogPreFilter(filter = {}) {
  return Boolean(
    filter.category ||
      filter.brand ||
      filter.colors ||
      filter.sizes ||
      filter.price ||
      filter.$expr
  )
}

async function loadLocalCandidates(filter, candidateLimit) {
  const match = {
    ...filter,
    embedding: { $exists: true, $ne: [] },
  }

  if (hasCatalogPreFilter(filter)) {
    return Product.find(match).select('_id embedding').limit(candidateLimit).lean()
  }

  // Broad catalog: sample a bounded set instead of loading arbitrary first N docs.
  return Product.aggregate([
    { $match: match },
    { $sample: { size: candidateLimit } },
    { $project: { _id: 1, embedding: 1 } },
  ])
}

/**
 * Dev / fallback path: score embeddings in-process, then hydrate top hits without
 * pulling embedding arrays into the final result set.
 */
export async function vectorSearchLocal(queryVector, filter, limit) {
  const candidateLimit = localCandidateLimit(limit)
  logger.warn(
    `${LOCAL_COSINE_DEV_WARNING} Scoring up to ${candidateLimit} embedding(s) in Node.js memory.`
  )

  const candidates = await loadLocalCandidates(filter, candidateLimit)

  const topIds = candidates
    .map((doc) => ({
      _id: doc._id,
      score: cosineSimilarity(queryVector, doc.embedding),
    }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ _id }) => _id)

  if (topIds.length === 0) return []

  const products = await Product.find({ _id: { $in: topIds } })
    .select(PRODUCT_FIELDS)
    .lean()

  const byId = new Map(products.map((p) => [String(p._id), p]))
  return topIds.map((id) => byId.get(String(id))).filter(Boolean)
}

/** Atlas ANN — computation stays in the database; embeddings are not returned. */
export async function vectorSearchAtlas(queryVector, filter, limit) {
  const pipeline = [
    {
      $vectorSearch: {
        index: config.search.vectorIndex,
        path: 'embedding',
        queryVector,
        numCandidates: config.search.vectorCandidates,
        limit,
        filter: Object.keys(filter).length ? filter : undefined,
      },
    },
    {
      $project: {
        name: 1,
        brand: 1,
        category: 1,
        price: 1,
        totalQty: 1,
        totalSold: 1,
        colors: 1,
        sizes: 1,
        images: 1,
        description: 1,
        tags: 1,
        searchDocument: 1,
        score: { $meta: 'vectorSearchScore' },
      },
    },
  ]

  return Product.aggregate(pipeline)
}

export async function vectorSearch(queryVector, mongoFilter, limit) {
  const backend = resolveVectorSearchBackend()

  if (backend === 'atlas') {
    try {
      const results = await vectorSearchAtlas(queryVector, mongoFilter, limit)
      if (results.length > 0) return results
    } catch (err) {
      const explicit = String(config.search.vectorBackend || '').toLowerCase() === 'atlas'
      logger.error(
        `[vectorSearch] Atlas $vectorSearch failed${explicit ? ' (VECTOR_SEARCH_BACKEND=atlas)' : ''}:`,
        err.message
      )
    }
  }

  if (backend === 'local') {
    return vectorSearchLocal(queryVector, mongoFilter, limit)
  }

  if (backend === 'atlas') {
    logger.warn(
      '[vectorSearch] Atlas returned no results or failed — falling back to local cosine (set VECTOR_SEARCH_BACKEND=local to silence Atlas attempts)'
    )
  }

  return vectorSearchLocal(queryVector, mongoFilter, limit)
}
