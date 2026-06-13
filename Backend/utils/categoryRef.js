import Category from '../model/Category.js'
import Product from '../model/Product.js'

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Category name for API, search scoring, and embeddings (populated doc or legacy string). */
export function categoryDisplayName(category) {
  if (!category) return ''
  if (typeof category === 'string') return category
  if (typeof category === 'object' && category.name) return category.name
  return ''
}

/** Only 24-char hex strings are treated as Mongo ObjectIds (mongoose isValid is too loose). */
function isStrictObjectIdString(value) {
  return /^[a-f0-9]{24}$/i.test(String(value || ''))
}

/** Resolve a category name or id string to a Category ObjectId. */
export async function resolveCategoryId(input) {
  if (input == null) return null
  const value = String(input).trim()
  if (!value) return null

  if (isStrictObjectIdString(value)) {
    const byId = await Category.findById(value).select('_id')
    if (byId) return byId._id
  }

  const byName = await Category.findOne({
    name: { $regex: `^${escapeRegex(value)}$`, $options: 'i' },
  }).select('_id')

  return byName?._id ?? null
}

/**
 * Mongo filter for products in a category — matches modern ObjectId refs,
 * legacy string category names, and legacy Category.products[] embed lists.
 */
export async function buildCategoryProductFilter(input) {
  const categoryId = await resolveCategoryId(input)
  if (!categoryId) return null

  const category = await Category.findById(categoryId).select('name products').lean()
  const clauses = [{ category: categoryId }]

  if (category?.name) {
    clauses.push({
      category: { $regex: `^${escapeRegex(category.name)}$`, $options: 'i' },
    })
  }

  const legacyProductIds = (category?.products || []).filter(Boolean)
  if (legacyProductIds.length) {
    clauses.push({ _id: { $in: legacyProductIds } })
  }

  return clauses.length === 1 ? clauses[0] : { $or: clauses }
}

export async function countProductsMatchingFilter(filter) {
  return Product.collection.countDocuments(filter)
}

export async function findProductIdsMatchingFilter(filter, { skip = 0, limit = 12 } = {}) {
  const rows = await Product.collection
    .find(filter, { projection: { _id: 1 } })
    .skip(skip)
    .limit(limit)
    .toArray()
  return rows.map((row) => row._id)
}

export async function findLeanProductsMatchingFilter(filter, { skip = 0, limit = 12, projection = null } = {}) {
  let cursor = Product.collection.find(filter)
  if (projection) cursor = cursor.project(projection)
  if (skip) cursor = cursor.skip(skip)
  if (limit) cursor = cursor.limit(limit)
  return cursor.toArray()
}

/** Attach `{ name }` category subdocs for lean products that only store ObjectIds. */
export async function enrichProductsWithCategoryNames(products) {
  if (!products?.length) return products

  const missingIds = [
    ...new Set(
      products
        .map((p) => p.category)
        .filter((category) => category && typeof category === 'object' && !category.name)
        .map((category) => String(category._id || category))
    ),
  ]

  if (!missingIds.length) return products

  const categories = await Category.find({ _id: { $in: missingIds } }).select('name').lean()
  const byId = new Map(categories.map((c) => [String(c._id), c]))

  return products.map((product) => {
    const category = product.category
    if (!category || category.name) return product
    const resolved = byId.get(String(category._id || category))
    return resolved ? { ...product, category: resolved } : product
  })
}
