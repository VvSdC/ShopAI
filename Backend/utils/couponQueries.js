import Coupon from '../model/Coupon.js'
import { isCouponExpired, isCouponLive, isCouponNotStarted } from './couponDates.js'

export function normalizeCouponCode(code) {
  return String(code || '').toUpperCase().trim()
}

export async function findCouponsByCode(code) {
  return Coupon.find({ code: normalizeCouponCode(code) }).sort({ createdAt: -1 })
}

/** Live coupon for checkout / cart apply (ignores expired duplicates). */
export async function findLiveCouponByCode(code) {
  const coupons = await findCouponsByCode(code)
  return coupons.find((c) => isCouponLive(c)) ?? null
}

/**
 * Block only if an active or scheduled coupon already uses this code.
 * Expired coupons with the same code do not block new creation.
 */
export async function assertCouponCodeAvailable(code, { excludeId = null } = {}) {
  const coupons = await findCouponsByCode(code)
  const conflict = coupons.find((c) => {
    if (excludeId && String(c._id) === String(excludeId)) return false
    return !isCouponExpired(c)
  })

  if (!conflict) return

  if (isCouponNotStarted(conflict)) {
    throw new Error('A scheduled coupon with this code already exists')
  }
  throw new Error('An active coupon with this code already exists')
}
