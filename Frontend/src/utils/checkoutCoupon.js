/**
 * Coupon code to send when creating a Stripe checkout session.
 * Prefer validated coupon from coupons slice; fall back to server cart coupon.
 */
export function resolveCheckoutCouponCode(appliedCoupon, serverCouponCode, discountPercent) {
  if (!discountPercent || discountPercent <= 0) return undefined
  const code = appliedCoupon?.coupon?.code || serverCouponCode
  if (!code) return undefined
  return String(code).trim()
}
