/** Calendar-day coupon dates (inclusive start & end). */

export function startOfDay(date = new Date()) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

export function endOfDay(date = new Date()) {
  const d = new Date(date)
  d.setHours(23, 59, 59, 999)
  return d
}

export function normalizeCouponDates({ startDate, endDate }) {
  return {
    startDate: startOfDay(startDate),
    endDate: endOfDay(endDate),
  }
}

export function assertCouponDateRange(startDate, endDate, { allowPastStart = false } = {}) {
  const start = startOfDay(startDate)
  const end = endOfDay(endDate)
  const todayStart = startOfDay(new Date())

  if (end < start) {
    throw new Error('End date must be on or after the start date')
  }
  if (end < todayStart) {
    throw new Error('End date cannot be in the past')
  }
  if (!allowPastStart && start < todayStart) {
    throw new Error('Start date cannot be before today')
  }
}

export function isCouponNotStarted(coupon, now = new Date()) {
  if (!coupon?.startDate) return false
  return now < startOfDay(coupon.startDate)
}

export function isCouponExpired(coupon, now = new Date()) {
  if (!coupon?.endDate) return true
  return now > endOfDay(coupon.endDate)
}

export function isCouponLive(coupon, now = new Date()) {
  if (!coupon) return false
  return !isCouponNotStarted(coupon, now) && !isCouponExpired(coupon, now)
}

export function couponStatusLabel(coupon, now = new Date()) {
  if (isCouponExpired(coupon, now)) return 'expired'
  if (isCouponNotStarted(coupon, now)) return 'scheduled'
  return 'active'
}

export function daysLeftLabel(endDate, now = new Date()) {
  const ms = endOfDay(endDate).getTime() - now.getTime()
  const days = Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)))
  if (days === 0) return 'Ends today'
  if (days === 1) return '1 day left'
  return `${days} days left`
}
