/** Total units in cart (sum of line quantities) — used for navbar badge and display. */
export function getCartUnitCount(cartItems) {
  if (!Array.isArray(cartItems) || cartItems.length === 0) return 0
  return cartItems.reduce((sum, item) => sum + (Number(item.qty) || 0), 0)
}
