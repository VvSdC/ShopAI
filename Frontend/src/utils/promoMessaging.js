/** @returns {boolean} True when a coupon is live and should be shown in the UI */
export function isPromoActive(coupon) {
  if (!coupon || coupon.isExpired === true) return false
  const code = String(coupon.code || '').trim()
  const discount = Number(coupon.discount)
  return code.length > 0 && Number.isFinite(discount) && discount > 0
}

/** Top announcement bar (Amazon / Flipkart style) */
export function navbarPromoText(coupon) {
  return `Extra ${coupon.discount}% off your order — use code ${coupon.code} at checkout · ${coupon.daysLeft}`
}

/** Homepage promo headline */
export function homepagePromoHeadline(coupon) {
  return `Extra ${coupon.discount}% off your order`
}

/** Homepage supporting line */
export function homepagePromoSubline(coupon) {
  return `Apply coupon code at checkout · ${coupon.daysLeft}`
}
