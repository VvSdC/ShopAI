import logger from '../../utils/logger.js'
import Product from '../../model/Product.js'
import { enrichProductsWithCategoryNames, resolveCategoryId } from '../../utils/categoryRef.js'
import {
  enrichProductsWithBrandNames,
  resolveBrandIds,
} from '../../utils/brandRef.js'
import { config } from '../../config/env.js'
import {
  buildProductSearchFilter,
  rankProductsByQuery,
  mapProductSearchResult,
  trimToRelevantProducts,
} from '../productSearch.js'
import { embedSearchQuery } from './embeddingService.js'
import { vectorSearch } from './vectorSearch.js'
import { reciprocalRankFusion, applyRerankOrder } from './hybridRanker.js'
import { rerankDocuments } from './rerankService.js'
import { applyAudienceFilter, detectAudienceFromQuery } from './audienceFilter.js'
import { mongoInCondition } from '../../utils/parseBrandFilter.js'

function buildMongoFilter(args) {
  const filter = {}
  if (args.categoryId) filter.category = args.categoryId
  if (args.brandIds?.length) {
    filter.brand = args.brandIds.length === 1 ? args.brandIds[0] : { $in: args.brandIds }
  }
  if (args.colors?.length) {
    const colorMatch = mongoInCondition(args.colors)
    if (colorMatch) filter.colors = colorMatch
  } else if (args.color) {
    filter.colors = args.color
  }
  if (args.size) filter.sizes = args.size
  if (args.min_price || args.max_price) {
    filter.price = {}
    if (args.min_price) filter.price.$gte = args.min_price
    if (args.max_price) filter.price.$lte = args.max_price
  }
  if (args.inStock === true) {
    filter.$expr = { $gt: [{ $subtract: ['$totalQty', '$totalSold'] }, 0] }
  }
  return filter
}

async function enrichProductsForSearch(products) {
  const withCategories = await enrichProductsWithCategoryNames(products)
  return enrichProductsWithBrandNames(withCategories)
}

async function keywordSearch(args, limit) {
  const filter = buildProductSearchFilter(args)
  const fetchLimit = Math.min(Math.max(limit * 4, 24), config.search.keywordLimit)

  const products = await Product.find(filter)
    .limit(fetchLimit)
    .select(
      'name brand category price totalQty totalSold colors sizes images description tags searchDocument'
    )
    .lean()

  const enriched = await enrichProductsForSearch(products)
  return rankProductsByQuery(enriched, args.query || '').slice(0, limit)
}

async function normalizeSearchArgs(args = {}) {
  const normalized = { ...args }
  delete normalized.category
  delete normalized.brands
  delete normalized.brand
  if (args.category) {
    normalized.categoryId = await resolveCategoryId(args.category)
    // Unknown category labels (e.g. "sports") are ignored — search by query instead.
  }
  const brandInputs = args.brands?.length ? args.brands : args.brand ? [args.brand] : []
  if (brandInputs.length) {
    normalized.brandNames = brandInputs
    normalized.brandIds = await resolveBrandIds(brandInputs)
  }
  // Audience: explicit arg wins over inferred-from-query.
  const rawAudience = args.audience ? String(args.audience).toLowerCase().trim() : null
  if (rawAudience && ['men', 'women', 'kids'].includes(rawAudience)) {
    normalized.audience = rawAudience
  } else {
    normalized.audience = detectAudienceFromQuery(args.query || '')
  }
  return { normalized }
}

export async function searchProducts(args = {}) {
  const query = args.query?.trim() || ''
  const limit = Math.min(Math.max(args.limit || 12, 1), 50)
  const page = Math.max(parseInt(args.page, 10) || 1, 1)
  const maxResults = Math.min(
    Math.max(config.search.maxResults || 100, limit),
    200
  )
  const { normalized } = await normalizeSearchArgs(args)
  const mongoFilter = buildMongoFilter(normalized)

  if (!query) {
    const audience = normalized.audience || null
    if (audience) {
      // Browse mode with audience: fetch a wider pool then filter (no keyword to filter by).
      const pool = await Product.find(mongoFilter)
        .limit(Math.min(200, Math.max(limit * 6, 60)))
        .select(
          'name brand category price totalQty totalSold colors sizes images description tags'
        )
        .lean()
      const enrichedPool = await enrichProductsForSearch(pool)
      const filtered = applyAudienceFilter(enrichedPool, audience)
      const total = filtered.length
      const slice = filtered.slice((page - 1) * limit, (page - 1) * limit + limit)
      return {
        products: slice.map(mapProductSearchResult),
        count: total,
        mode: 'browse',
        page,
        limit,
      }
    }
    const total = await Product.countDocuments(mongoFilter)
    const products = await Product.find(mongoFilter)
      .skip((page - 1) * limit)
      .limit(limit)
      .select(
        'name brand category price totalQty totalSold colors sizes images description tags'
      )
      .lean()
    const enriched = await enrichProductsForSearch(products)
    return {
      products: enriched.map(mapProductSearchResult),
      count: total,
      mode: 'browse',
      page,
      limit,
    }
  }

  const keywordResults = await keywordSearch(normalized, config.search.keywordLimit)
  let vectorResults = []

  // Integration tests must not depend on live embedding/rerank providers —
  // hung free-tier APIs were timing out productSearchPagination at 30s.
  if (!config.isTest) {
    try {
      const { vector } = await embedSearchQuery(query)
      vectorResults = await vectorSearch(vector, mongoFilter, config.search.vectorLimit)
    } catch (err) {
      logger.warn('[search] vector path skipped:', err.message)
    }
  }

  const keywordIds = keywordResults.map((p) => String(p._id))
  const vectorIds = vectorResults.map((p) => String(p._id))
  const mergedIds = reciprocalRankFusion(
    [keywordIds, vectorIds].filter((list) => list.length > 0),
    config.search.rrfK
  )

  const productMap = new Map()
  ;[...keywordResults, ...vectorResults].forEach((p) => {
    productMap.set(String(p._id), p)
  })

  let ordered = mergedIds.map((id) => productMap.get(id)).filter(Boolean)

  if (ordered.length === 0) {
    return {
      products: [],
      count: 0,
      mode: 'hybrid',
      page,
      limit,
      message: 'No products found in the catalog for this search.',
    }
  }

  if (!config.isTest) {
    const docs = ordered.map((p) => p.searchDocument || `${p.name}. ${p.description || ''}`)
    try {
      const rerankRows = await rerankDocuments(
        query,
        docs,
        Math.min(config.search.rerank.topN, docs.length)
      )
      if (rerankRows?.length) {
        const mergedIdList = ordered.map((p) => String(p._id))
        const rerankedIndices = rerankRows.map((r) => r.index)
        const reorderedIds = applyRerankOrder(mergedIdList, rerankedIndices, ordered)
        ordered = reorderedIds.map((id) => productMap.get(id)).filter(Boolean)
      }
    } catch (err) {
      logger.warn('[search] rerank skipped:', err.message)
    }
  }

  // Always apply the lexical relevance trim — even after a successful rerank.
  // The reranker keeps semantically-similar items that may still be off-topic
  // (e.g. "cricket helmet" for a "cricket bat" query). The lexical pass uses
  // word-overlap signals against the actual product fields to cut tail noise.
  ordered = trimToRelevantProducts(ordered, query, maxResults)

  // Apply query-derived audience/gender filter (men/women/kids). No dedicated
  // schema field exists yet, so we match against tags, category name, and product
  // name. This is applied AFTER lexical trim so we don't discard candidates the
  // reranker likes, but it strictly excludes obviously mismatched gender.
  ordered = applyAudienceFilter(ordered, normalized.audience || detectAudienceFromQuery(query))

  if (ordered.length === 0) {
    return {
      products: [],
      count: 0,
      mode: 'hybrid',
      page,
      limit,
      message: 'No products in the catalog match that search — try different words or fewer filters.',
    }
  }

  const total = ordered.length
  const start = (page - 1) * limit
  const pageSlice = ordered.slice(start, start + limit)
  const enriched = await enrichProductsForSearch(pageSlice)
  const final = enriched.map(mapProductSearchResult)
  return { products: final, count: total, mode: 'hybrid', page, limit }
}

/** Fast typeahead — keyword index only (no embed/rerank). */
export async function searchProductSuggestions(args = {}) {
  const query = args.query?.trim() || ''
  const limit = Math.min(Math.max(args.limit || 6, 1), 10)

  if (query.length < 2) {
    return { suggestions: [], query }
  }

  const { normalized } = await normalizeSearchArgs(args)
  const products = await keywordSearch(normalized, limit)

  return {
    query,
    suggestions: products.map(mapProductSearchResult),
  }
}

export async function searchProductsForChat(userId, args) {
  const result = await searchProducts(args)
  if (!result.products.length) {
    return {
      count: 0,
      products: [],
      message: result.message || 'No products found in the catalog for this search.',
      rule:
        'Tell the customer nothing matched in ONE short sentence. Do NOT list, suggest, or name any products. Do NOT retry with wider/looser terms. Offer to try a different search or category.',
    }
  }
  return {
    count: result.count,
    products: result.products,
    rule: `Show ALL ${result.count} products (no more, no fewer) in the EXACT order returned. Use EXACT names, prices, and stock. Include each productUrl as a markdown link: [View product](productUrl). Never add, invent, or repeat products. If the count is small (1–2), that is by design — do not pad with other items.`,
  }
}
