import { categoryDisplayName } from '../utils/categoryRef.js'
import { brandMongoCondition, mongoInCondition } from '../utils/parseBrandFilter.js'

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function buildProductSearchFilter(args) {
  const conditions = []

  if (args.query) {
    const words = args.query.trim().split(/\s+/).filter(Boolean)
    if (words.length > 0) {
      const wordConditions = words.map((word) => {
        const escaped = escapeRegex(word)
        return {
          $or: [
            { name: { $regex: escaped, $options: 'i' } },
            { description: { $regex: escaped, $options: 'i' } },
            { brand: { $regex: escaped, $options: 'i' } },
            { tags: { $regex: escaped, $options: 'i' } },
          ],
        }
      })
      conditions.push({ $and: wordConditions })

      // For multi-word searches like "cricket ball", the main product term
      // (last word) must appear in the product name — excludes bats tagged cricket-only.
      if (words.length >= 2) {
        const primaryTerm = escapeRegex(words[words.length - 1])
        conditions.push({ name: { $regex: primaryTerm, $options: 'i' } })
      }
    }
  }

  if (args.categoryId) {
    conditions.push({ category: args.categoryId })
  }
  if (args.brands?.length) {
    const brandMatch = brandMongoCondition(args.brands)
    if (brandMatch) conditions.push({ brand: brandMatch })
  } else if (args.brand) {
    conditions.push({ brand: { $regex: escapeRegex(args.brand), $options: 'i' } })
  }
  if (args.colors?.length) {
    const colorMatch = mongoInCondition(args.colors)
    if (colorMatch) conditions.push({ colors: colorMatch })
  } else if (args.color) {
    conditions.push({ colors: { $regex: escapeRegex(args.color), $options: 'i' } })
  }
  if (args.size) {
    conditions.push({ sizes: args.size })
  }
  if (args.min_price || args.max_price) {
    const priceFilter = {}
    if (args.min_price) priceFilter.$gte = args.min_price
    if (args.max_price) priceFilter.$lte = args.max_price
    conditions.push({ price: priceFilter })
  }

  return conditions.length > 0 ? { $and: conditions } : {}
}

export function scoreProductForQuery(product, query) {
  if (!query?.trim()) return 1

  const words = query.trim().split(/\s+/).filter(Boolean)
  const normalizedQuery = query.toLowerCase().trim()
  const name = (product.name || '').toLowerCase()
  const description = (product.description || '').toLowerCase()
  const tagsText = (product.tags || []).join(' ').toLowerCase()
  const brand = (product.brand || '').toLowerCase()
  const category = categoryDisplayName(product.category).toLowerCase()

  let score = 0

  if (name.includes(normalizedQuery)) score += 150
  if (words.length > 1 && words.every((word) => name.includes(word.toLowerCase()))) {
    score += 80
  }

  words.forEach((word, index) => {
    const token = word.toLowerCase()
    const weight = 1 + index * 0.75

    if (name.includes(token)) score += 35 * weight
    else if (description.includes(token)) score += 14 * weight
    else if (tagsText.includes(token)) score += 7 * weight
    else if (brand.includes(token)) score += 5 * weight
    else if (category.includes(token)) score += 5 * weight
    else score -= 15
  })

  return score
}

export function rankProductsByQuery(products, query) {
  return products
    .map((product) => ({
      product,
      score: scoreProductForQuery(product, query || ''),
    }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ product }) => product)
}

/**
 * Drop weak tail matches.
 *
 * Three guardrails (any one cuts the tail):
 *   - score <= 0 (no lexical overlap at all — vector false positives)
 *   - score < topScore * RELATIVE_FLOOR (too weak vs. best match)
 *   - large gap to previous item (e.g. 3 strong matches then noise)
 *
 * Always keeps at least one product when something matched, so we don't
 * accidentally return zero results for queries that did match.
 */
const RELEVANCE_RELATIVE_FLOOR = 0.55
const RELEVANCE_GAP_RATIO = 0.5

export function trimToRelevantProducts(products, query, maxResults = 12) {
  if (!products?.length || !query?.trim()) return products.slice(0, maxResults)

  const scored = products.map((product) => ({
    product,
    score: scoreProductForQuery(product, query),
  }))
  const maxScore = scored.reduce((m, { score }) => (score > m ? score : m), 0)

  // No lexical overlap anywhere (e.g. plural query vs. singular names) —
  // trust the upstream order (keyword/vector/rerank) and just cap the count.
  if (maxScore <= 0) return products.slice(0, maxResults)

  const sorted = [...scored].sort((a, b) => b.score - a.score)
  const topScore = sorted[0].score
  const kept = []
  let lastScore = topScore

  for (const { product, score } of sorted) {
    if (kept.length >= maxResults) break
    if (score <= 0) break
    if (kept.length > 0 && score < topScore * RELEVANCE_RELATIVE_FLOOR) break
    if (kept.length > 0 && lastScore > 0 && score < lastScore * RELEVANCE_GAP_RATIO) break
    kept.push(product)
    lastScore = score
  }

  if (kept.length > 0) return kept
  return sorted
    .filter(({ score }) => score > 0)
    .slice(0, Math.min(3, maxResults))
    .map(({ product }) => product)
}

export function mapProductSearchResult(product) {
  const id = String(product._id)
  const images = Array.isArray(product.images) ? product.images.filter(Boolean) : []
  return {
    id,
    _id: product._id,
    name: product.name,
    brand: product.brand,
    category: categoryDisplayName(product.category),
    price: product.price,
    description: product.description,
    inStock: product.totalQty - product.totalSold > 0,
    qtyLeft: product.totalQty - product.totalSold,
    colors: product.colors,
    sizes: product.sizes,
    images,
    image: images[0] || null,
    productUrl: `/products/${id}`,
  }
}
