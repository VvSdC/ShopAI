/** Fulfillment lifecycle stored on Order.status (admin-editable). */
export const ORDER_FULFILLMENT_STATUSES = [
  'pending',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
]

/**
 * Customer/admin-facing status derived from fulfillment + refund + return overlay.
 * Does not replace Order.status — use fulfillmentStatus for ship/cancel workflows.
 */
export const ORDER_DISPLAY_STATUSES = [
  ...ORDER_FULFILLMENT_STATUSES,
  'return_in_progress',
  'partially_refunded',
  'refunded',
]

const BASE_LABELS = {
  pending: 'Pending',
  processing: 'Processing',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  return_in_progress: 'Return in progress',
  partially_refunded: 'Partially refunded',
  refunded: 'Refunded',
}

/**
 * Cross-reference fulfillment, refundStatus, and optional pending ReturnRequest.status.
 * Priority: open return request → refund overlays → base fulfillment status.
 */
export function resolveOrderDisplayStatus(
  order,
  { returnRequestStatus = null } = {}
) {
  const fulfillmentStatus = order?.status || 'pending'

  if (returnRequestStatus === 'requested') {
    return {
      fulfillmentStatus,
      displayStatus: 'return_in_progress',
      displayStatusLabel: BASE_LABELS.return_in_progress,
      returnRequestStatus,
    }
  }

  if (order?.refundStatus === 'full') {
    const displayStatusLabel =
      fulfillmentStatus === 'cancelled'
        ? 'Cancelled · Refunded'
        : BASE_LABELS.refunded
    return {
      fulfillmentStatus,
      displayStatus: 'refunded',
      displayStatusLabel,
      returnRequestStatus: returnRequestStatus || null,
    }
  }

  if (order?.refundStatus === 'partial') {
    return {
      fulfillmentStatus,
      displayStatus: 'partially_refunded',
      displayStatusLabel: BASE_LABELS.partially_refunded,
      returnRequestStatus: returnRequestStatus || null,
    }
  }

  return {
    fulfillmentStatus,
    displayStatus: fulfillmentStatus,
    displayStatusLabel: BASE_LABELS[fulfillmentStatus] || fulfillmentStatus,
    returnRequestStatus: returnRequestStatus || null,
  }
}

export function attachOrderDisplayStatus(order, context = {}) {
  const plain = order?.toObject?.() ?? order
  return {
    ...plain,
    ...resolveOrderDisplayStatus(plain, context),
  }
}
