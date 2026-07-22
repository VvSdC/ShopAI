import Product from '../model/Product.js'

/** Case-insensitive uniqueness for product names (strength 2 ignores case). */
export const PRODUCT_NAME_COLLATION = { locale: 'en', strength: 2 }

export function trimProductName(name) {
  return String(name || '').trim()
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Find a product by name, ignoring case (for duplicate checks). */
export async function findProductByNameCaseInsensitive(name, { excludeId } = {}) {
  const trimmed = trimProductName(name)
  if (!trimmed) return null

  const filter = { name: trimmed }
  if (excludeId) {
    filter._id = { $ne: excludeId }
  }

  const byCollation = await Product.findOne(filter).collation(PRODUCT_NAME_COLLATION)
  if (byCollation) return byCollation

  return Product.findOne({
    ...filter,
    name: { $regex: `^${escapeRegex(trimmed)}$`, $options: 'i' },
  })
}
