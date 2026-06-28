export const POST_CHECKOUT_FLAG = 'shopai_post_checkout'
export const POST_CHECKOUT_WINDOW_MS = 10 * 60 * 1000

export function isRecentPostCheckout() {
  const at = Number(sessionStorage.getItem(POST_CHECKOUT_FLAG) || 0)
  return at > 0 && Date.now() - at < POST_CHECKOUT_WINDOW_MS
}

export function markPostCheckout() {
  sessionStorage.setItem(POST_CHECKOUT_FLAG, String(Date.now()))
}

export function clearPostCheckoutFlag() {
  sessionStorage.removeItem(POST_CHECKOUT_FLAG)
}
