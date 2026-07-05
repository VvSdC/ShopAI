import Review from '../model/Review.js'
import { PUBLIC_REVIEW_MATCH } from '../utils/reviewVisibility.js'
import { brandDisplayName } from '../utils/brandRef.js'

/**
 * One aggregation for approved-review count + average per product.
 * Avoids N+1 populate of full Review documents on listing pages.
 */
export async function reviewStatsByProductIds(productIds = []) {
  const ids = productIds.filter(Boolean)
  if (!ids.length) return new Map()

  const rows = await Review.aggregate([
    {
      $match: {
        product: { $in: ids },
        ...PUBLIC_REVIEW_MATCH,
      },
    },
    {
      $group: {
        _id: '$product',
        totalReviews: { $sum: 1 },
        averageRating: { $avg: '$rating' },
      },
    },
  ])

  return new Map(
    rows.map((row) => [
      String(row._id),
      {
        totalReviews: row.totalReviews || 0,
        averageRating: row.totalReviews
          ? Math.round((row.averageRating || 0) * 10) / 10
          : 0,
      },
    ])
  )
}

/** Shape a product for catalog cards — ratings only, no review bodies or embeddings. */
export function mapProductForList(product, stats = {}) {
  const doc = product?.toObject ? product.toObject({ virtuals: false }) : { ...product }
  const {
    reviews: _reviews,
    embedding: _embedding,
    embeddingProvider: _embeddingProvider,
    embeddingModel: _embeddingModel,
    embeddingVersion: _embeddingVersion,
    embeddingDimension: _embeddingDimension,
    embeddedAt: _embeddedAt,
    searchDocument: _searchDocument,
    user: _user,
    __v: _v,
    ...rest
  } = doc

  const totalQty = Number(rest.totalQty) || 0
  const totalSold = Number(rest.totalSold) || 0
  const category =
    rest.category && typeof rest.category === 'object' && rest.category.name
      ? rest.category.name
      : rest.category
  const brand =
    rest.brand && typeof rest.brand === 'object' && rest.brand.name
      ? rest.brand.name
      : brandDisplayName(rest.brand)

  return {
    ...rest,
    category,
    brand,
    qtyLeft: totalQty - totalSold,
    totalReviews: stats.totalReviews ?? 0,
    averageRating: stats.averageRating ?? 0,
  }
}

export async function mapProductsForList(products = []) {
  const statsMap = await reviewStatsByProductIds(products.map((p) => p._id))
  return products.map((product) =>
    mapProductForList(product, statsMap.get(String(product._id)) || {})
  )
}
