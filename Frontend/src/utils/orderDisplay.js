const REFUND_TIMELINE = '5–7 business days'

export function isAdminOrderStatusLocked(order) {
  if (!order) return true
  if (order.status === 'cancelled') return true
  if (order.paymentStatus === 'Not paid') return true
  return false
}

export function adminOrderStatusLockReason(order) {
  if (order?.status === 'cancelled') return 'Cancelled orders cannot be edited'
  if (order?.paymentStatus === 'Not paid') return 'Unpaid orders cannot be edited'
  return ''
}

export function orderHasRefundInProgress(order) {
  if (!order) return false
  const hasRefundRecord =
    order.refundStatus === 'full' ||
    order.refundStatus === 'partial' ||
    Number(order.totalRefunded) > 0 ||
    (Array.isArray(order.stripeRefundIds) && order.stripeRefundIds.length > 0)

  if (!hasRefundRecord) return false

  if (order.status === 'cancelled') return true

  return order.status === 'delivered' && order.refundStatus !== 'none'
}

export function getPaymentStatusLabel(order) {
  if (orderHasRefundInProgress(order)) {
    return 'Refund in progress'
  }
  return order.paymentStatus || 'Unknown'
}

export function getPaymentStatusColor(order, paymentStatusColor) {
  if (orderHasRefundInProgress(order)) {
    return 'bg-amber-100 text-amber-800'
  }
  return paymentStatusColor[order.paymentStatus] || 'bg-gray-100 text-gray-800'
}

export function getRefundSummary(order) {
  if (!orderHasRefundInProgress(order)) return null

  const amount = Number(order.totalRefunded) || 0
  return {
    amount,
    amountLabel: amount > 0 ? `₹${amount.toLocaleString('en-IN')}` : null,
    timeline: REFUND_TIMELINE,
    isFullRefund: order.refundStatus === 'full',
  }
}

export { REFUND_TIMELINE }
