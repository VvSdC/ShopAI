import logger from '../utils/logger.js'
import Order from '../model/Order.js'
import { getStripeClient } from '../config/stripeClient.js'
import { orderService } from './orderService.js'
import { expireCheckoutJob } from './checkoutQueue.js'

export const CHECKOUT_LINK_TTL_MS = 5 * 60 * 1000

function isPaidStatus(status) {
  return status === 'paid'
}

function orderItemsSummary(orderItems) {
  return (orderItems || []).slice(0, 10).map((item) => ({
    name: item.name || 'Item',
    qty: item.qty || 1,
    size: item.size,
    color: item.color,
  }))
}

function paidStatusPayload(order, { emailTo, emailSent } = {}) {
  return {
    paid: true,
    expired: false,
    paymentStatus: order.paymentStatus,
    orderStatus: order.status,
    orderNumber: order.orderNumber,
    orderId: String(order._id),
    totalPrice: order.totalPrice,
    items: orderItemsSummary(order.orderItems),
    itemCount: order.orderItems?.length || 0,
    confirmationEmailSent:
      order.confirmationEmailSent === true || emailSent === true,
    emailTo: emailTo || null,
    checkoutSource: order.checkoutSource || 'cart',
    redirectTo:
      order.checkoutSource === 'chat' ? '/assistant' : '/customer-profile',
    secondsRemaining: 0,
  }
}

export async function syncOrderPaymentFromStripe(order, session) {
  if (!session || !order) return { order, fulfillment: null }

  const receiptEmail =
    session.customer_details?.email || session.customer_email || null
  const { order: refreshed, fulfillment } = await orderService.applyStripeCheckoutSession(
    order._id,
    session,
    { receiptEmail }
  )
  return { order: refreshed, fulfillment }
}

export async function pollOrderPaymentStatus(userId, orderId) {
  const order = await Order.findById(orderId)
  if (!order) {
    throw new Error('Order not found')
  }
  if (order.user.toString() !== userId.toString()) {
    throw new Error('Not authorised to view this order')
  }

  const now = Date.now()
  const expiresAt = order.checkoutExpiresAt
    ? new Date(order.checkoutExpiresAt).getTime()
    : null
  const secondsRemaining =
    expiresAt != null ? Math.max(0, Math.floor((expiresAt - now) / 1000)) : null

  if (isPaidStatus(order.paymentStatus)) {
    return paidStatusPayload(order)
  }

  if (expiresAt != null && now >= expiresAt) {
    await expireCheckoutJob(order._id)
    return {
      paid: false,
      expired: true,
      paymentStatus: order.paymentStatus,
      orderStatus: order.status,
      orderNumber: order.orderNumber,
      orderId: String(order._id),
      checkoutSource: order.checkoutSource || 'cart',
      redirectTo: null,
      secondsRemaining: 0,
    }
  }

  if (order.stripeSessionId) {
    try {
      const session = await getStripeClient().checkout.sessions.retrieve(order.stripeSessionId)
      if (session.payment_status === 'paid') {
        const { order: refreshed, fulfillment } = await syncOrderPaymentFromStripe(
          order,
          session
        )
        return paidStatusPayload(refreshed, {
          emailTo: fulfillment?.emailTo,
          emailSent: fulfillment?.emailSent,
        })
      }
      if (session.status === 'expired') {
        return {
          paid: false,
          expired: true,
          paymentStatus: order.paymentStatus,
          orderStatus: order.status,
          orderNumber: order.orderNumber,
          orderId: String(order._id),
          checkoutSource: order.checkoutSource || 'cart',
          redirectTo: null,
          secondsRemaining: 0,
        }
      }
    } catch (err) {
      logger.warn('[paymentPoll] Stripe retrieve failed:', err.message)
    }
  }

  return {
    paid: false,
    expired: false,
    paymentStatus: order.paymentStatus,
    orderStatus: order.status,
    orderNumber: order.orderNumber,
    orderId: String(order._id),
    checkoutSource: order.checkoutSource || 'cart',
    redirectTo: null,
    secondsRemaining,
  }
}

export async function expireOrderCheckoutSession(userId, orderId) {
  const order = await Order.findById(orderId)
  if (!order) throw new Error('Order not found')
  if (order.user.toString() !== userId.toString()) {
    throw new Error('Not authorised')
  }
  if (isPaidStatus(order.paymentStatus)) {
    return { expired: false, alreadyPaid: true }
  }

  await expireCheckoutJob(order._id)

  return { expired: true, alreadyPaid: false }
}
