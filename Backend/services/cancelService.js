import Order from '../model/Order.js'
import Product from '../model/Product.js'
import { canCancelOrder, STORE_POLICY } from '../config/storePolicy.js'
import { normalizeOrderItems, productIdKey } from './orderLineItems.js'
import { createStripeRefund } from './orderRefund.js'

async function restoreStockForItems(items) {
  for (const item of items) {
    const product = await Product.findById(item._id)
    if (product) {
      const qty = Number(item.qty) || 1
      product.totalSold = Math.max(0, product.totalSold - qty)
      await product.save()
    }
  }
}

export async function cancelOrderForUser(userId, orderId) {
  const order = await Order.findById(orderId)
  if (!order) {
    throw new Error('Order not found')
  }
  if (order.user.toString() !== userId.toString()) {
    throw new Error('Not authorised to cancel this order')
  }
  if (!canCancelOrder(order)) {
    throw new Error(
      'This order cannot be cancelled. Only pending or processing orders can be cancelled before they ship.'
    )
  }

  let stripeRefundId = null
  let refundAmount = 0

  if (
    order.paymentStatus === 'paid' &&
    STORE_POLICY.cancellation.autoRefundIfPaid
  ) {
    refundAmount =
      Math.round(((order.totalPrice || 0) - (order.totalRefunded || 0)) * 100) / 100
    if (refundAmount > 0) {
      const refund = await createStripeRefund(order, refundAmount)
      stripeRefundId = refund.id
    }
  }

  if (order.postPaymentProcessed) {
    await restoreStockForItems(normalizeOrderItems(order.orderItems))
  }

  order.status = 'cancelled'
  order.orderItems = normalizeOrderItems(order.orderItems).map((item) => ({
    ...item,
    lineStatus: 'cancelled',
    cancelledQty: item.qty,
  }))

  if (refundAmount > 0) {
    order.totalRefunded = (order.totalRefunded || 0) + refundAmount
    order.refundStatus =
      order.totalRefunded >= (order.totalPrice || 0) - 0.01 ? 'full' : 'partial'
    if (stripeRefundId) {
      order.stripeRefundIds = [...(order.stripeRefundIds || []), stripeRefundId]
    }
  }

  await order.save()

  return {
    order,
    refundAmount,
    stripeRefundId,
    message:
      refundAmount > 0
        ? `Order cancelled. A refund of ₹${refundAmount.toLocaleString('en-IN')} will appear on your original payment method within ${STORE_POLICY.cancellation.refundTimelineDays}.`
        : 'Order cancelled successfully.',
  }
}
