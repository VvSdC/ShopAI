const REFUND_TIMELINE = '5–7 business days'

const BASE_STATUS_LABELS = {
  pending: 'Pending',
  processing: 'Processing',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  return_in_progress: 'Return in progress',
  partially_refunded: 'Partially refunded',
  refunded: 'Refunded',
}

/** Unified status label cross-referencing fulfillment, refund, and return overlays. */
export function resolveOrderDisplayStatus(
  order,
  { returnRequestStatus = null } = {}
) {
  const fulfillmentStatus = order?.fulfillmentStatus || order?.status || 'pending'
  const pendingReturn = returnRequestStatus ?? order?.returnRequestStatus ?? null

  if (pendingReturn === 'requested') {
    return {
      fulfillmentStatus,
      displayStatus: 'return_in_progress',
      displayStatusLabel: BASE_STATUS_LABELS.return_in_progress,
      returnRequestStatus: pendingReturn,
    }
  }

  if (order?.refundStatus === 'full') {
    return {
      fulfillmentStatus,
      displayStatus: 'refunded',
      displayStatusLabel:
        fulfillmentStatus === 'cancelled'
          ? 'Cancelled · Refunded'
          : BASE_STATUS_LABELS.refunded,
      returnRequestStatus: pendingReturn,
    }
  }

  if (order?.refundStatus === 'partial') {
    return {
      fulfillmentStatus,
      displayStatus: 'partially_refunded',
      displayStatusLabel: BASE_STATUS_LABELS.partially_refunded,
      returnRequestStatus: pendingReturn,
    }
  }

  return {
    fulfillmentStatus,
    displayStatus: fulfillmentStatus,
    displayStatusLabel: BASE_STATUS_LABELS[fulfillmentStatus] || fulfillmentStatus,
    returnRequestStatus: pendingReturn,
  }
}

export function getOrderDisplayStatus(order) {
  if (order?.displayStatus && order?.displayStatusLabel) {
    return {
      fulfillmentStatus: order.fulfillmentStatus || order.status,
      displayStatus: order.displayStatus,
      displayStatusLabel: order.displayStatusLabel,
      returnRequestStatus: order.returnRequestStatus ?? null,
    }
  }
  return resolveOrderDisplayStatus(order)
}

const DISPLAY_STATUS_COLORS = {
  pending: 'bg-amber-100 text-amber-800',
  processing: 'bg-blue-100 text-blue-800',
  shipped: 'bg-indigo-100 text-indigo-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-stone-200 text-stone-700',
  return_in_progress: 'bg-orange-100 text-orange-800',
  partially_refunded: 'bg-purple-100 text-purple-800',
  refunded: 'bg-rose-100 text-rose-800',
}

export function getOrderDisplayStatusColor(order) {
  const { displayStatus } = getOrderDisplayStatus(order)
  return DISPLAY_STATUS_COLORS[displayStatus] || 'bg-stone-100 text-stone-800'
}

export function orderFulfillmentStatus(order) {
  return getOrderDisplayStatus(order).fulfillmentStatus
}

export function isReturnInProgress(order) {
  return getOrderDisplayStatus(order).displayStatus === 'return_in_progress'
}

export function isOrderRefunded(order) {
  const { displayStatus } = getOrderDisplayStatus(order)
  return displayStatus === 'refunded' || displayStatus === 'partially_refunded'
}

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
