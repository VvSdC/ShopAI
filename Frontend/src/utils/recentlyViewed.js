const STORAGE_KEY = 'shopai_recently_viewed'
const MAX_ITEMS = 12

export function recordRecentlyViewed(product) {
  if (!product?._id) return

  const entry = {
    _id: product._id,
    name: product.name,
    price: product.price,
    image: product.images?.[0] || product.image || '',
    brand: product.brand || '',
    qtyLeft: product.qtyLeft,
    inStock: (product.qtyLeft ?? 0) > 0,
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const existing = raw ? JSON.parse(raw) : []
    const list = Array.isArray(existing) ? existing : []
    const next = [entry, ...list.filter((item) => String(item._id) !== String(entry._id))].slice(
      0,
      MAX_ITEMS
    )
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    // ignore quota / private mode
  }
}

export function getRecentlyViewed() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}
