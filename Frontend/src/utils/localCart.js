function isValidCartItem(item) {
  if (!item || typeof item !== 'object') return false
  if (!item._id || !item.color || !item.size) return false

  const qty = Number(item.qty)
  const price = Number(item.price)
  if (!Number.isFinite(qty) || qty < 1) return false
  if (!Number.isFinite(price) || price < 0) return false

  return true
}

function normalizeCartItem(item) {
  const qty = Number(item.qty)
  const price = Number(item.price)

  return {
    _id: String(item._id),
    name: typeof item.name === 'string' ? item.name : '',
    qty,
    price,
    totalPrice: Number.isFinite(Number(item.totalPrice)) ? Number(item.totalPrice) : qty * price,
    color: String(item.color),
    size: String(item.size),
    description: typeof item.description === 'string' ? item.description : '',
    image: typeof item.image === 'string' ? item.image : '',
  }
}

/** Parse and validate cart items from localStorage; drops malformed entries. */
export function parseLocalCart(raw) {
  if (!raw) return []

  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) {
      localStorage.removeItem('cartItems')
      return []
    }

    return parsed.filter(isValidCartItem).map(normalizeCartItem)
  } catch {
    localStorage.removeItem('cartItems')
    return []
  }
}
