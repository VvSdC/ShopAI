import Order from '../model/Order.js'
import mongoose from 'mongoose'
import { getStripeClient } from '../config/stripeClient.js'
import User from '../model/User.js'
import { canCancelOrder, STORE_POLICY } from '../config/storePolicy.js'
import { normalizeOrderItems, getActiveQty } from './orderLineItems.js'
import { productIdKey, clearCart } from './cartService.js'
import {
  processPaidOrder,
  resendOrderConfirmation,
  parseOrderId,
} from './orderFulfillment.js'
import { createStripeRefund, persistPaymentReferences } from './orderRefund.js'
import { releaseStock } from './stockService.js'
import { AppError } from '../utils/appError.js'
import logger from '../utils/logger.js'
import { enrichOrderForResponse, enrichOrdersForResponse } from './orderEnrichment.js'

const ALLOWED_ORDER_STATUSES = ['pending', 'processing', 'shipped', 'delivered']

function encodeOrderCursor(order) {
  if (!order?.createdAt || !order?._id) return null
  return Buffer.from(
    JSON.stringify({
      createdAt: order.createdAt.toISOString(),
      id: String(order._id),
    })
  ).toString('base64url')
}

function decodeOrderCursor(cursor) {
  if (!cursor) return null
  try {
    const parsed = JSON.parse(Buffer.from(String(cursor), 'base64url').toString('utf8'))
    const createdAt = new Date(parsed.createdAt)
    const id = parsed.id
    if (!id || Number.isNaN(createdAt.getTime())) return null
    return { createdAt, id }
  } catch {
    return null
  }
}

function buildAdminOrderCursorFilter(cursor) {
  const decoded = decodeOrderCursor(cursor)
  if (!decoded) return null

  return {
    $or: [
      { createdAt: { $lt: decoded.createdAt } },
      {
        createdAt: decoded.createdAt,
        _id: { $lt: new mongoose.Types.ObjectId(decoded.id) },
      },
    ],
  }
}

const PAID_SALES_MATCH = {
  paymentStatus: 'paid',
  status: { $ne: 'cancelled' },
}

export class OrderService {
  async findById(orderId) {
    return Order.findById(orderId)
  }

  async getForUserOrAdmin(orderId, userId) {
    const order = await Order.findById(orderId)
    if (!order) {
      throw new AppError('Order not found', 404)
    }
    const user = await User.findById(userId).select('isAdmin')
    this.assertUserCanAccess(order, userId, { isAdmin: user?.isAdmin })
    return enrichOrderForResponse(order)
  }

  async findForUser(userId, orderId) {
    return Order.findOne({ _id: orderId, user: userId })
  }

  async findByReference(userId, { order_id, order_number }) {
    if (order_id) {
      return Order.findOne({ _id: order_id, user: userId })
    }
    if (order_number) {
      return Order.findOne({ orderNumber: order_number, user: userId })
    }
    return null
  }

  assertUserCanAccess(order, userId, { isAdmin = false } = {}) {
    if (!order) {
      throw new AppError('Order not found', 404)
    }
    if (!isAdmin && (!order.user || order.user.toString() !== userId.toString())) {
      throw new AppError('Not authorised to view this order', 403)
    }
  }

  async listForUser(userId, { page = 1, limit = 5 } = {}) {
    const safePage = Math.max(1, page)
    const safeLimit = Math.min(Math.max(1, limit), 50)
    const skip = (safePage - 1) * safeLimit

    const filter = { user: userId }
    const [total, orders] = await Promise.all([
      Order.countDocuments(filter),
      Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(safeLimit),
    ])

    return {
      orders: await enrichOrdersForResponse(orders),
      pagination: {
        page: safePage,
        limit: safeLimit,
        total,
        totalPages: Math.ceil(total / safeLimit) || 0,
      },
    }
  }

  async listAll({ limit = 5, cursor = null } = {}) {
    const safeLimit = Math.min(Math.max(1, limit), 50)
    let filter = {}

    if (cursor) {
      const cursorFilter = buildAdminOrderCursorFilter(cursor)
      if (!cursorFilter) {
        throw new AppError('Invalid pagination cursor', 400)
      }
      filter = cursorFilter
    }

    const [total, rows] = await Promise.all([
      Order.countDocuments({}),
      Order.find(filter)
        .populate('user', 'fullname email phone')
        .sort({ createdAt: -1, _id: -1 })
        .limit(safeLimit + 1),
    ])

    const hasMore = rows.length > safeLimit
    const orders = hasMore ? rows.slice(0, safeLimit) : rows
    const nextCursor =
      hasMore && orders.length ? encodeOrderCursor(orders[orders.length - 1]) : null

    return {
      orders: await enrichOrdersForResponse(orders),
      pagination: {
        limit: safeLimit,
        total,
        hasMore,
        nextCursor,
      },
    }
  }

  async getSalesStats() {
    const date = new Date()
    const today = new Date(date.getFullYear(), date.getMonth(), date.getDate())

    const [orders, saleToday] = await Promise.all([
      Order.aggregate([
        { $match: PAID_SALES_MATCH },
        {
          $group: {
            _id: null,
            minimumSale: { $min: '$totalPrice' },
            totalSales: { $sum: '$totalPrice' },
            maxSale: { $max: '$totalPrice' },
            avgSale: { $avg: '$totalPrice' },
          },
        },
      ]),
      Order.aggregate([
        {
          $match: {
            ...PAID_SALES_MATCH,
            createdAt: { $gte: today },
          },
        },
        {
          $group: {
            _id: null,
            totalSales: { $sum: '$totalPrice' },
          },
        },
      ]),
    ])

    return { orders, saleToday }
  }

  async updateStatus(orderId, status) {
    const order = await Order.findById(orderId)
    if (!order) {
      throw new AppError('Order not found', 404)
    }
    if (order.status === 'cancelled') {
      throw new AppError('Cancelled orders cannot be updated', 400)
    }
    if (!ALLOWED_ORDER_STATUSES.includes(status)) {
      throw new AppError('Invalid order status', 400)
    }

    const update = { status }
    if (status === 'delivered') {
      update.deliveredAt = order.deliveredAt || new Date()
    }

    return enrichOrderForResponse(
      await Order.findByIdAndUpdate(orderId, update, { new: true })
    )
  }

  async restoreStockForCancelledItems(items) {
    for (const item of normalizeOrderItems(items)) {
      const productId = productIdKey(item._id)
      const qty = getActiveQty(item)
      if (!productId || qty <= 0) continue
      await releaseStock(productId, qty)
    }
  }

  async cancelForUser(userId, orderId) {
    const order = await Order.findById(orderId)
    if (!order) {
      throw new AppError('Order not found', 404)
    }
    this.assertUserCanAccess(order, userId)

    if (!canCancelOrder(order)) {
      throw new AppError(
        'This order cannot be cancelled. Only pending or processing orders can be cancelled before they ship.',
        400
      )
    }

    if (order.postPaymentProcessed) {
      await this.restoreStockForCancelledItems(order.orderItems)
    }

    let stripeRefundId = null
    let refundAmount = 0

    if (order.paymentStatus === 'paid' && STORE_POLICY.cancellation.autoRefundIfPaid) {
      refundAmount =
        Math.round(((order.totalPrice || 0) - (order.totalRefunded || 0)) * 100) / 100
      if (refundAmount > 0) {
        const refund = await createStripeRefund(order, refundAmount)
        stripeRefundId = refund.id
      }
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
      order: await enrichOrderForResponse(order),
      refundAmount,
      stripeRefundId,
      message:
        refundAmount > 0
          ? `Order cancelled. A refund of ₹${refundAmount.toLocaleString('en-IN')} will appear on your original payment method within ${STORE_POLICY.cancellation.refundTimelineDays}.`
          : 'Order cancelled successfully.',
    }
  }

  async retrieveStripeSession(sessionId) {
    return getStripeClient().checkout.sessions.retrieve(sessionId)
  }

  async ensureCartClearedForPaidOrder(order) {
    const userId = order?.user?._id || order?.user
    if (!userId) return
    try {
      await clearCart(userId)
    } catch (err) {
      logger.warn(
        `[orders] clear cart after payment failed for order ${order?.orderNumber || order?._id}:`,
        err.message
      )
    }
  }

  /**
   * Apply Stripe checkout session fields to an order and run paid fulfillment when needed.
   * Used by webhook, verify-payment, and payment polling.
   */
  async applyStripeCheckoutSession(orderId, session, { receiptEmail } = {}) {
    const id = parseOrderId(orderId)
    const existingOrder = await Order.findById(id)
    if (!existingOrder) {
      return { order: null, updatedOrder: null, fulfillment: null }
    }

    if (existingOrder.status === 'cancelled') {
      return {
        order: existingOrder,
        updatedOrder: existingOrder,
        fulfillment: null,
        skipped: true,
        reason: 'order_cancelled',
      }
    }

    if (existingOrder.paymentStatus === 'paid') {
      await this.ensureCartClearedForPaidOrder(existingOrder)
      return {
        order: existingOrder,
        updatedOrder: existingOrder,
        fulfillment: null,
        alreadyPaid: true,
      }
    }

    const paymentRefs = await persistPaymentReferences(id, session)

    const updatedOrder = await Order.findByIdAndUpdate(
      id,
      {
        totalPrice: session.amount_total / 100,
        currency: session.currency,
        paymentMethod: session.payment_method_types?.[0] || 'card',
        paymentStatus: session.payment_status,
        ...paymentRefs,
      },
      { new: true }
    )

    let fulfillment = null
    if (session.payment_status === 'paid' && updatedOrder) {
      const email =
        receiptEmail ||
        session.customer_details?.email ||
        session.customer_email ||
        null
      fulfillment = await processPaidOrder(id, { receiptEmail: email })
    }

    const refreshedOrder = await Order.findById(id)
    return { order: refreshedOrder, updatedOrder, fulfillment }
  }

  async verifyPaymentForUser(userId, sessionId) {
    const session = await this.retrieveStripeSession(sessionId)
    if (!session) {
      throw new AppError('Session not found', 404)
    }

    const orderId = parseOrderId(session.metadata?.orderId)
    if (!orderId) {
      throw new AppError('No order associated with this session', 400)
    }

    const existingOrder = await Order.findById(orderId)
    if (!existingOrder) {
      throw new AppError('Order not found', 404)
    }
    this.assertUserCanAccess(existingOrder, userId)

    const receiptEmail =
      session.customer_details?.email || session.customer_email || null

    const { updatedOrder, fulfillment } = await this.applyStripeCheckoutSession(
      orderId,
      session,
      { receiptEmail }
    )

    const refreshedOrder = await Order.findById(orderId).select(
      'confirmationEmailSent postPaymentProcessed paymentStatus orderNumber user'
    )

    if (refreshedOrder?.paymentStatus === 'paid') {
      await this.ensureCartClearedForPaidOrder(refreshedOrder)
    }

    return {
      order: await Order.findById(orderId),
      confirmationEmailSent: refreshedOrder?.confirmationEmailSent === true,
      emailTo: fulfillment?.emailTo || receiptEmail,
      emailError: fulfillment?.emailError,
      alreadyProcessed: existingOrder.postPaymentProcessed === true,
      fulfillment,
    }
  }

  async resendConfirmationForUser(userId, sessionId) {
    const session = await this.retrieveStripeSession(sessionId)
    if (!session) {
      throw new AppError('Session not found', 404)
    }

    const orderId = parseOrderId(session.metadata?.orderId)
    if (!orderId) {
      throw new AppError('No order associated with this session', 400)
    }

    const order = await Order.findById(orderId)
    if (!order) {
      throw new AppError('Order not found', 404)
    }
    this.assertUserCanAccess(order, userId)

    const receiptEmail =
      session.customer_details?.email || session.customer_email || null

    return resendOrderConfirmation(orderId, { receiptEmail, force: true })
  }

  formatOrderForChat(order) {
    return {
      orderId: String(order._id),
      orderNumber: order.orderNumber,
      status: order.status,
      paymentStatus: order.paymentStatus,
      totalPrice: order.totalPrice,
      currency: order.currency || 'INR',
      itemCount: order.orderItems?.length || 0,
      items: order.orderItems?.map((i) => ({
        name: i.name,
        qty: i.qty,
        price: i.price,
      })),
      coupon: order.coupon || null,
      orderedOn: order.createdAt,
      deliveredAt: order.deliveredAt || null,
    }
  }

  formatOrderDetailsForChat(order) {
    return {
      orderId: String(order._id),
      orderNumber: order.orderNumber,
      status: order.status,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      totalPrice: order.totalPrice,
      currency: order.currency || 'INR',
      coupon: order.coupon || null,
      deliveredAt: order.deliveredAt || null,
      items: order.orderItems?.map((i) => ({
        name: i.name,
        qty: i.qty,
        price: i.price,
        size: i.size,
        color: i.color,
      })),
      shippingAddress: order.shippingAddress,
      orderedOn: order.createdAt,
    }
  }

  async listForChat(userId, limit = 5) {
    const safeLimit = Math.min(Math.max(limit, 1), 10)
    const orders = await Order.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(safeLimit)

    if (!orders.length) {
      return { message: 'You have no orders yet.' }
    }

    return orders.map((order) => this.formatOrderForChat(order))
  }

  async getDetailsForChat(userId, { order_id, order_number }) {
    const order = await this.findByReference(userId, { order_id, order_number })
    if (!order) {
      return { error: 'Order not found. Make sure the order number is correct.' }
    }
    return this.formatOrderDetailsForChat(order)
  }
}

export const orderService = new OrderService()
