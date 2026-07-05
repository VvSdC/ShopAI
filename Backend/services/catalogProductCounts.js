import Product from '../model/Product.js'

/** @returns {Map<string, number>} categoryId → product count */
export async function countProductsByCategoryId() {
  const rows = await Product.aggregate([
    { $match: { category: { $ne: null } } },
    { $group: { _id: '$category', count: { $sum: 1 } } },
  ])

  const counts = new Map()
  for (const row of rows) {
    if (row._id) counts.set(String(row._id), row.count)
  }
  return counts
}

/** @returns {Map<string, number>} brandId → product count */
export async function countProductsByBrandId() {
  const rows = await Product.aggregate([
    { $match: { brand: { $ne: null } } },
    { $group: { _id: '$brand', count: { $sum: 1 } } },
  ])

  const counts = new Map()
  for (const row of rows) {
    if (row._id) counts.set(String(row._id), row.count)
  }
  return counts
}

/** @deprecated Use countProductsByBrandId */
export const countProductsByBrandName = countProductsByBrandId

/** @returns {Promise<Array<object>>} categories with `productCount` from Product.category refs */
export async function attachProductCountsToCategories(categories) {
  if (!categories?.length) return []

  const counts = await countProductsByCategoryId()
  return categories.map((cat) => ({
    ...cat,
    productCount: counts.get(String(cat._id)) || 0,
  }))
}
