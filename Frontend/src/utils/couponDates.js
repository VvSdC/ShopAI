/** Match backend calendar-day coupon logic in admin UI */

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

/** Send to API when creating/updating a coupon */
export function serializeCouponDates(startDate, endDate) {
  return {
    startDate: startOfDay(startDate).toISOString(),
    endDate: endOfDay(endDate).toISOString(),
  }
}

export function getCouponDisplayStatus(coupon) {
  const now = new Date()
  const start = startOfDay(coupon.startDate)
  const end = endOfDay(coupon.endDate)
  if (now > end) return { key: 'expired', label: 'Expired' }
  if (now < start) return { key: 'scheduled', label: 'Scheduled' }
  return { key: 'active', label: 'Active' }
}
