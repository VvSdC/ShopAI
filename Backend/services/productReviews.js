import Review from '../model/Review.js'
import { PUBLIC_REVIEW_MATCH } from '../utils/reviewVisibility.js'

/** Public reviews for a product detail page (Review.product is the source of truth). */
export async function loadPublicReviewsForProduct(productId) {
  if (!productId) return []
  return Review.find({ product: productId, ...PUBLIC_REVIEW_MATCH })
    .populate('user', 'fullname')
    .sort({ createdAt: -1 })
    .lean()
}
