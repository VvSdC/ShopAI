import logger from '../../utils/logger.js'
import Product from '../../model/Product.js'
import { enrichProductsWithCategoryNames, resolveCategoryId } from '../../utils/categoryRef.js'
import { config } from '../../config/env.js'
import {
  buildProductSearchFilter,
  rankProductsByQuery,
  mapProductSearchResult,
  trimToRelevantProducts,
} from '../productSearch.js'
import { embedText } from './embeddingService.js'
import { vectorSearch } from './vectorSearch.js'
import { reciprocalRankFusion, applyRerankOrder } from './hybridRanker.js'
import { rerankDocuments } from './rerankService.js'

function buildMongoFilter(args) {
  const filter = {}
  if (args.categoryId) filter.category = args.categoryId
  if (args.brand) filter.brand = args.brand
  if (args.color) filter.colors = args.color
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

async function keywordSearch(args, limit) {
  const filter = buildProductSearchFilter(args)
  const fetchLimit = Math.min(Math.max(limit * 4, 24), config.search.keywordLimit)

  const products = await Product.find(filter)
    .limit(fetchLimit)
    .populate('category', 'name')
    .select(
      'name brand category price totalQty totalSold colors sizes images description tags searchDocument'
    )
    .lean()

  return rankProductsByQuery(products, args.query || '').slice(0, limit)
}

async function normalizeSearchArgs(args = {}) {
  const normalized = { ...args }
  if (args.category) {
    normalized.categoryId = await resolveCategoryId(args.category)
    if (!normalized.categoryId) {
      return { normalized, categoryMissing: true }
    }
  }
  return { normalized, categoryMissing: false }
}

export async function searchProducts(args = {}) {
  const query = args.query?.trim() || ''
  const limit = Math.min(Math.max(args.limit || 12, 1), 50)
  const { normalized, categoryMissing } = await normalizeSearchArgs(args)
  if (categoryMissing) {
    return {
      products: [],
      count: 0,
      mode: query ? 'hybrid' : 'browse',
      message: 'No products found for this category.',
    }
  }
  const mongoFilter = buildMongoFilter(normalized)

  if (!query) {
    const products = await Product.find(mongoFilter)
      .limit(limit)
      .populate('category', 'name')
      .select(
        'name brand category price totalQty totalSold colors sizes images description tags'
      )
      .lean()
    return { products: products.map(mapProductSearchResult), count: products.length, mode: 'browse' }
  }

  const keywordResults = await keywordSearch(normalized, config.search.keywordLimit)
  let vectorResults = []

  try {
    const { vector } = await embedText(query)
    vectorResults = await vectorSearch(vector, mongoFilter, config.search.vectorLimit)
  } catch (err) {
    logger.warn('[search] vector path skipped:', err.message)
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

  let ordered = mergedIds.map((id) => productMap.get(id)).filter(Boolean).slice(0, limit * 2)

  if (ordered.length === 0) {
    return {
      products: [],
      count: 0,
      mode: 'hybrid',
      message: 'No products found in the catalog for this search.',
    }
  }

  const docs = ordered.map((p) => p.searchDocument || `${p.name}. ${p.description || ''}`)
  const rerankRows = await rerankDocuments(query, docs, Math.min(config.search.rerank.topN, docs.length))

  if (rerankRows?.length) {
    const mergedIdList = ordered.map((p) => String(p._id))
    const rerankedIndices = rerankRows.map((r) => r.index)
    const reorderedIds = applyRerankOrder(mergedIdList, rerankedIndices, ordered)
    ordered = reorderedIds.map((id) => productMap.get(id)).filter(Boolean)
  } else {
    ordered = trimToRelevantProducts(ordered, query, limit)
  }

  const enriched = await enrichProductsWithCategoryNames(ordered.slice(0, limit))
  const final = enriched.map(mapProductSearchResult)
  return { products: final, count: final.length, mode: 'hybrid' }
}

export async function searchProductsForChat(userId, args) {
  const result = await searchProducts(args)
  if (!result.products.length) {
    return {
      count: 0,
      products: [],
      message: result.message || 'No products found in the catalog for this search.',
      rule: 'Tell the user nothing matched. Do NOT suggest or name products that were not returned here.',
    }
  }
  return {
    count: result.count,
    products: result.products,
    rule:
      'List products in the EXACT order returned (most relevant first). Use EXACT names, prices, and stock. Include each productUrl as a markdown link: [View product](productUrl). Never add products not in this list.',
  }
}
