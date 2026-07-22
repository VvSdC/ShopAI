export const STORE_POLICY = {
  cancellation: {
    allowedStatuses: ['pending', 'processing'],
    autoRefundIfPaid: true,
    refundTimelineDays: '5–7 business days',
  },
  returns: {
    enabled: true,
    windowDays: 3,
    allowedOrderStatuses: ['delivered'],
    requireReason: true,
    allowPartialQty: true,
    adminApprovalRequired: true,
    refundTimelineDays: '5–7 business days after approval',
  },
  refunds: {
    method: 'Original payment method via Stripe',
  },
}

export function getReturnWindowEnd(deliveredAt) {
  if (!deliveredAt) return null
  const end = new Date(deliveredAt)
  end.setDate(end.getDate() + STORE_POLICY.returns.windowDays)
  return end
}

export function isWithinReturnWindow(deliveredAt, now = new Date()) {
  const end = getReturnWindowEnd(deliveredAt)
  if (!end) return false
  return now <= end
}

export function isPaymentSettled(order) {
  return String(order?.paymentStatus || '').toLowerCase() === 'paid'
}

/** Stripe Checkout session created and not yet paid or expired — user may be on the payment page. */
export function hasActiveStripeCheckout(order) {
  if (!order?.stripeSessionId) return false
  if (isPaymentSettled(order)) return false
  if (order.status === 'cancelled') return false
  if (order.checkoutExpiresAt && new Date(order.checkoutExpiresAt) <= new Date()) {
    return false
  }
  return true
}

export function canCancelOrder(order) {
  if (order.status === 'cancelled') return false
  if (hasActiveStripeCheckout(order)) return false
  return STORE_POLICY.cancellation.allowedStatuses.includes(order.status)
}
