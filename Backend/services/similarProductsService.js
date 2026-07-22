import Product from '../model/Product.js'
import { AppError } from '../utils/appError.js'
import { enrichProductsWithCategoryNames } from '../utils/categoryRef.js'
import { enrichProductsWithBrandNames } from '../utils/brandRef.js'
import { mapProductSearchResult } from './productSearch.js'
import { vectorSearch } from './search/vectorSearch.js'

const PRODUCT_FIELDS =
  'name brand category price totalQty totalSold colors sizes images description tags averageRating'

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
 * Find catalog neighbors using the product's stored embedding (no extra LLM/embed API call).
 * Falls back to same-category bestsellers when the source has no vector yet.
 */
export async function getSimilarProducts(productId, { limit = 8 } = {}) {
  const cappedLimit = Math.min(Math.max(Number(limit) || 8, 1), 12)
  const source = await loadSourceProduct(productId)

  let products = []
  let mode = 'category_fallback'

  if (Array.isArray(source.embedding) && source.embedding.length > 0) {
    const hits = await vectorSearch(source.embedding, { _id: { $ne: source._id } }, cappedLimit)
    if (hits.length > 0) {
      products = hits
      mode = 'vector_neighbors'
    }
  }

  if (!products.length) {
    products = await fetchCategoryFallback(source, cappedLimit)
    mode = products.length ? 'category_fallback' : 'none'
  }

  const enriched = await enrichProductsWithBrandNames(
    await enrichProductsWithCategoryNames(products)
  )
  const mapped = enriched.map(mapProductSearchResult)

  return {
    products: mapped,
    count: mapped.length,
    mode,
    sourceProductId: String(productId),
    grounded: true,
    explanation:
      mode === 'vector_neighbors'
        ? 'Matched using stored product embeddings — same semantic index as ShopAI search.'
        : mode === 'category_fallback'
          ? 'Matched from the same category.'
          : 'No similar products found yet.',
  }
}
