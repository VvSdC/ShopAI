import mongoose from 'mongoose'
import Category from '../model/Category.js'

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

/** Resolve a category name or id string to a Category ObjectId. */
export async function resolveCategoryId(input) {
  if (input == null) return null
  const value = String(input).trim()
  if (!value) return null

  if (mongoose.Types.ObjectId.isValid(value)) {
    const byId = await Category.findById(value).select('_id')
    if (byId) return byId._id
  }

  const byName = await Category.findOne({
    name: { $regex: `^${escapeRegex(value)}$`, $options: 'i' },
  }).select('_id')

  return byName?._id ?? null
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
