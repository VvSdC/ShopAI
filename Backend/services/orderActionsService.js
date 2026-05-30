import Order from '../model/Order.js'
import { canCancelOrder, STORE_POLICY } from '../config/storePolicy.js'
import { RETURN_REASONS } from '../constants/returnReasons.js'
import { cancelOrderForUser } from './cancelService.js'
import {
  getReturnEligibility,
  createReturnRequest,
} from './returnService.js'
import { normalizeOrderItems } from './orderLineItems.js'

export async function resolveOrderForUser(userId, { order_id, order_number }) {
  let order = null
  if (order_id) {
    order = await Order.findOne({ _id: order_id, user: userId })
  } else if (order_number) {
    order = await Order.findOne({ orderNumber: order_number, user: userId })
  }
  return order
}

export function getOrderCancelReturnStatus(order) {
  if (!order) {
    return { found: false, message: 'Order not found.' }
  }

  const summary = {
    found: true,
    orderId: String(order._id),
    orderNumber: order.orderNumber,
    status: order.status,
    paymentStatus: order.paymentStatus,
    totalPrice: order.totalPrice,
    deliveredAt: order.deliveredAt || null,
    items: normalizeOrderItems(order.orderItems).map((item) => ({
      name: item.name,
      qty: item.qty,
      size: item.size,
      color: item.color,
    })),
  }

  if (order.status === 'cancelled') {
    return {
      ...summary,
      availableAction: 'none',
      message: 'This order is already cancelled.',
    }
  }

  if (canCancelOrder(order)) {
    return {
      ...summary,
      availableAction: 'cancel',
      message:
        'This order can be cancelled before it ships. Use cancel_order after the user confirms.',
      refundNote:
        order.paymentStatus === 'paid'
          ? `If paid, a refund of up to ₹${order.totalPrice} will be issued to the original payment method.`
          : 'This order is not paid yet — cancellation stops the order with no charge.',
    }
  }

  if (order.status === 'shipped') {
    return {
      ...summary,
      availableAction: 'none',
      message:
        'This order has shipped. Returns can be requested after it is marked delivered.',
    }
  }

  const returnEligibility = getReturnEligibility(order)
  if (returnEligibility.eligible) {
    return {
      ...summary,
      availableAction: 'return',
      message: returnEligibility.message,
      returnWindowEndsAt: returnEligibility.windowEndsAt,
      returnableLines: returnEligibility.lines,
      returnReasons: RETURN_REASONS,
      policyNote: `Returns must be requested within ${STORE_POLICY.returns.windowDays} days of delivery. Admin approval is required before refund.`,
    }
  }

  return {
    ...summary,
    availableAction: 'none',
    message: returnEligibility.message,
  }
}

export async function cancelOrderByReference(userId, args) {
  const order = await resolveOrderForUser(userId, args)
  if (!order) {
    return { error: 'Order not found. Check the order number.' }
  }

  if (order.status === 'cancelled') {
    return {
      success: true,
      alreadyCancelled: true,
      orderNumber: order.orderNumber,
      message: `Order #${order.orderNumber} is already cancelled.`,
    }
  }

  if (!canCancelOrder(order)) {
    const status = getOrderCancelReturnStatus(order)
    return {
      error: 'This order cannot be cancelled.',
      hint: status.message,
      availableAction: status.availableAction,
    }
  }

  const result = await cancelOrderForUser(userId, order._id)
  return {
    success: true,
    orderNumber: result.order.orderNumber,
    status: result.order.status,
    refundAmount: result.refundAmount,
    message: result.message,
  }
}

export async function submitReturnByReference(userId, args) {
  const order = await resolveOrderForUser(userId, args)
  if (!order) {
    return { error: 'Order not found. Check the order number.' }
  }

  if (order.status === 'cancelled') {
    return {
      error: 'This order was cancelled — returns are not applicable.',
    }
  }

  const eligibility = getReturnEligibility(order)
  if (!eligibility.eligible) {
    return {
      error: eligibility.message,
      availableAction: 'none',
    }
  }

  const reasonCode = args.reason_code
  if (!reasonCode) {
    return {
      error: 'A return reason is required.',
      returnReasons: RETURN_REASONS,
      hint: 'Ask the user to pick a reason, then call submit_return_request again.',
    }
  }

  let items = []
  if (args.return_all !== false && (!args.items || args.items.length === 0)) {
    items = eligibility.lines.map((line) => ({
      lineId: line.lineId,
      qty: line.returnableQty,
      reasonCode: reasonCode,
      reasonComment: args.reason_comment || '',
    }))
  } else if (args.items?.length) {
    items = args.items.map((item) => ({
      lineId: item.line_id,
      qty: item.qty,
      reasonCode: item.reason_code || reasonCode,
      reasonComment: item.reason_comment || args.reason_comment || '',
    }))
  } else {
    return { error: 'No items selected for return.' }
  }

  const result = await createReturnRequest(userId, order._id, items)
  return {
    success: true,
    orderNumber: order.orderNumber,
    requestId: String(result.request._id),
    refundAmountEstimate: result.request.refundAmount,
    message: result.message,
    note: 'An admin will review your return request. Refund is processed after approval.',
  }
}
