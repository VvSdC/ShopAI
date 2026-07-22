export function getWishlistCount(items = []) {
  return Array.isArray(items) ? items.length : 0
}
