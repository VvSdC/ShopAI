function isValidWishlistItem(item) {
  if (!item || typeof item !== 'object') return false
  if (!item._id) return false
  const price = Number(item.price)
  if (!Number.isFinite(price) || price < 0) return false
  return true
}

function normalizeWishlistItem(item) {
  return {
    _id: String(item._id),
    name: typeof item.name === 'string' ? item.name : '',
    price: Number(item.price) || 0,
    image: typeof item.image === 'string' ? item.image : '',
    brand: typeof item.brand === 'string' ? item.brand : '',
    qtyLeft: Number.isFinite(Number(item.qtyLeft)) ? Number(item.qtyLeft) : undefined,
    inStock: item.inStock !== false,
  }
}

export function parseLocalWishlist(raw) {
  if (!raw) return []

  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) {
      localStorage.removeItem('wishlistItems')
      return []
    }
    return parsed.filter(isValidWishlistItem).map(normalizeWishlistItem)
  } catch {
    localStorage.removeItem('wishlistItems')
    return []
  }
}

export function wishlistProductFromCatalog(product) {
  const id = product?._id || product?.id
  if (!id) return null
  return normalizeWishlistItem({
    _id: id,
    name: product?.name || '',
    price: product?.price || 0,
    image: product?.images?.[0] || product?.image || '',
    brand: product?.brand || '',
    qtyLeft: product?.qtyLeft,
    inStock: (product?.qtyLeft ?? 1) > 0,
  })
}
