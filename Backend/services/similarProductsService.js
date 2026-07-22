import Product from '../model/Product.js'
import { AppError } from '../utils/appError.js'
import { enrichProductsWithCategoryNames } from '../utils/categoryRef.js'
import { enrichProductsWithBrandNames } from '../utils/brandRef.js'
import { mapProductSearchResult } from './productSearch.js'
import { cosineSimilarity } from './search/embeddingService.js'
import { config } from '../config/env.js'
import * as cache from './cacheService.js'
import logger from '../utils/logger.js'

const PRODUCT_FIELDS =
  'name brand category price totalQty totalSold colors sizes images description tags averageRating'

/** Cap on candidate pool loaded into Node for cosine — bounded by category size. */
const SIMPLE_CANDIDATE_CAP = 400

/** Min cosine similarity to be considered a real match (drops noise on small catalogs). */
const SIMPLE_MIN_SCORE = 0.35

/** Cache similar-product lookups for a short window (embeddings change infrequently). */
const CACHE_TTL_SECONDS = 30 * 60

function cacheKey(productId, limit) {
  return `similar:v2:${productId}:${limit}`
}

async function loadSourceProduct(productId) {
  const source = await Product.findById(productId)
    .select('embedding embeddingDimension category brand price totalQty totalSold')
    .lean()
  if (!source) {
    throw new AppError('Product not found', 404)
  }
  return source
}

async function fetchCategoryFallback(source, limit) {
  if (!source.category) return []

  const products = await Product.find({
    _id: { $ne: source._id },
    category: source.category,
    $expr: { $gt: [{ $subtract: ['$totalQty', '$totalSold'] }, 0] },
  })
    .select(PRODUCT_FIELDS)
    .sort({ averageRating: -1, createdAt: -1 })
    .limit(limit)
    .lean()

  return products
}

/**
 * Simple in-process cosine — pre-filters by category + in-stock (small pool),
 * then scores in Node. Avoids Atlas $vectorSearch cost for the PDP "similar" section.
 *
 * Why this over Atlas:
 * - Category filter typically leaves 50–200 candidates → trivially fast in Node
 * - Zero DB $vectorSearch minutes on Atlas Search (free tier friendly)
 * - Result is cached in Redis for 30 minutes per (productId, limit)
 */
async function simpleVectorNeighbors(source, limit) {
  if (!Array.isArray(source.embedding) || source.embedding.length === 0) return []

  const filter = {
    _id: { $ne: source._id },
    embedding: { $exists: true, $ne: [] },
    $expr: { $gt: [{ $subtract: ['$totalQty', '$totalSold'] }, 0] },
  }
  if (source.category) filter.category = source.category

  const candidates = await Product.find(filter)
    .select('_id embedding')
    .limit(SIMPLE_CANDIDATE_CAP)
    .lean()

  if (candidates.length === 0) return []

  const scored = candidates
    .map((doc) => ({
      _id: doc._id,
      score: cosineSimilarity(source.embedding, doc.embedding),
    }))
    .filter(({ score }) => score >= SIMPLE_MIN_SCORE)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)

  if (scored.length === 0) return []

  const ids = scored.map(({ _id }) => _id)
  const products = await Product.find({ _id: { $in: ids } })
    .select(PRODUCT_FIELDS)
    .lean()

  const byId = new Map(products.map((p) => [String(p._id), p]))
  return ids.map((id) => byId.get(String(id))).filter(Boolean)
}

function resolveMode() {
  const raw = String(config.similarProducts?.mode || 'simple').toLowerCase()
  return raw === 'atlas' || raw === 'vector' ? 'atlas' : 'simple'
}

/**
 * Find catalog neighbors using the product's stored embedding (no extra LLM/embed API call).
 * Two modes:
 *   simple (default) — category-scoped in-process cosine, cached in Redis
 *   atlas            — MongoDB $vectorSearch (opt in via SIMILAR_PRODUCTS_MODE=atlas)
 * Falls back to same-category bestsellers when the source has no vector yet.
 */
export async function getSimilarProducts(productId, { limit = 8, skipCache = false } = {}) {
  const cappedLimit = Math.min(Math.max(Number(limit) || 8, 1), 12)

  if (!skipCache) {
    const cached = await cache.get(cacheKey(productId, cappedLimit)).catch(() => null)
    if (cached) return cached
  }

  const source = await loadSourceProduct(productId)
  const mode = resolveMode()

  let products = []
  let matchedMode = 'category_fallback'

  if (Array.isArray(source.embedding) && source.embedding.length > 0) {
    if (mode === 'atlas') {
      // Opt-in path — only when SIMILAR_PRODUCTS_MODE=atlas.
      const { vectorSearch } = await import('./search/vectorSearch.js')
      const hits = await vectorSearch(
        source.embedding,
        { _id: { $ne: source._id } },
        cappedLimit
      )
      if (hits.length > 0) {
        products = hits
        matchedMode = 'vector_neighbors'
      }
    } else {
      const hits = await simpleVectorNeighbors(source, cappedLimit)
      if (hits.length > 0) {
        products = hits
        matchedMode = 'vector_neighbors'
      }
    }
  }

  if (!products.length) {
    products = await fetchCategoryFallback(source, cappedLimit)
    matchedMode = products.length ? 'category_fallback' : 'none'
  }

  const enriched = await enrichProductsWithBrandNames(
    await enrichProductsWithCategoryNames(products)
  )
  const mapped = enriched.map(mapProductSearchResult)

  const payload = {
    products: mapped,
    count: mapped.length,
    mode: matchedMode,
    sourceProductId: String(productId),
    grounded: true,
    explanation:
      matchedMode === 'vector_neighbors'
        ? 'Matched using stored product embeddings — same semantic index as ShopAI search.'
        : matchedMode === 'category_fallback'
          ? 'Matched from the same category.'
          : 'No similar products found yet.',
  }

  if (!skipCache && mapped.length > 0) {
    cache
      .set(cacheKey(productId, cappedLimit), payload, CACHE_TTL_SECONDS)
      .catch((err) => logger.warn('[similarProducts] cache set failed:', err.message))
  }

  return payload
}
