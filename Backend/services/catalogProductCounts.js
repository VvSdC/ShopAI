import Product from '../model/Product.js'
import {
  buildCategoryProductFilter,
  countProductsMatchingFilter,
  findProductIdsMatchingFilter,
} from '../utils/categoryRef.js'

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

/** @returns {Map<string, number>} brand name → product count */
export async function countProductsByBrandName() {
  const rows = await Product.aggregate([
    { $match: { brand: { $exists: true, $ne: '' } } },
    { $group: { _id: '$brand', count: { $sum: 1 } } },
  ])

  const counts = new Map()
  for (const row of rows) {
    if (row._id) counts.set(String(row._id), row.count)
  }
  return counts
}

/** @returns {Promise<Array<object>>} categories with accurate `productCount` */
export async function attachProductCountsToCategories(categories) {
  if (!categories?.length) return []

  return Promise.all(
    categories.map(async (cat) => {
      const filter = await buildCategoryProductFilter(cat.name)
      const productCount = filter ? await countProductsMatchingFilter(filter) : 0
      return { ...cat, productCount }
    })
  )
}
