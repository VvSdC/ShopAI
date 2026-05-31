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
            { category: { $regex: escaped, $options: 'i' } },
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

  if (args.category) {
    conditions.push({ category: { $regex: args.category, $options: 'i' } })
  }
  if (args.brand) {
    conditions.push({ brand: { $regex: args.brand, $options: 'i' } })
  }
  if (args.color) {
    conditions.push({ colors: { $regex: args.color, $options: 'i' } })
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
  const category = (product.category || '').toLowerCase()

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

export function mapProductSearchResult(product) {
  const id = String(product._id)
  const images = Array.isArray(product.images) ? product.images.filter(Boolean) : []
  return {
    id,
    _id: product._id,
    name: product.name,
    brand: product.brand,
    category: product.category,
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
