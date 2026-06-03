/** Reviews visible on product pages and in public APIs */
export const PUBLIC_REVIEW_MATCH = {
  $or: [
    { moderationStatus: 'approved' },
    { moderationStatus: { $exists: false } },
  ],
}

export function isPublicReview(review) {
  if (!review) return false
  const status = review.moderationStatus
  return !status || status === 'approved'
}

export function filterPublicReviews(reviews = []) {
  return reviews.filter(isPublicReview)
}
