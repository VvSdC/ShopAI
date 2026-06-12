import Order from '../model/Order.js'
import { getStripeClient } from '../config/stripeClient.js'
import User from '../model/User.js'
import { canCancelOrder, STORE_POLICY } from '../config/storePolicy.js'
import { normalizeOrderItems } from './orderLineItems.js'
import {
  processPaidOrder,
  resendOrderConfirmation,
  parseOrderId,
} from './orderFulfillment.js'
import { createStripeRefund, persistPaymentReferences } from './orderRefund.js'
import { releaseStock } from './stockService.js'

const ALLOWED_ORDER_STATUSES = ['pending', 'processing', 'shipped', 'delivered']

export class OrderService {
  async findById(orderId) {
    return Order.findById(orderId)
  }

  async getForUserOrAdmin(orderId, userId) {
    const order = await Order.findById(orderId)
    if (!order) {
      throw new Error('Order not found')
    }
    const user = await User.findById(userId).select('isAdmin')
    this.assertUserCanAccess(order, userId, { isAdmin: user?.isAdmin })
    return order
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
      throw new Error('Order not found')
    }
    if (order.user.toString() !== userId.toString() && !isAdmin) {
      const err = new Error('Not authorised to view this order')
      err.statusCode = 403
      throw err
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
      orders,
      pagination: {
        page: safePage,
        limit: safeLimit,
        total,
        totalPages: Math.ceil(total / safeLimit) || 0,
      },
    }
  }

  async listAll({ page = 1, limit = 5 } = {}) {
    const safePage = Math.max(1, page)
    const safeLimit = Math.min(Math.max(1, limit), 50)
    const skip = (safePage - 1) * safeLimit

    const [total, orders] = await Promise.all([
      Order.countDocuments({}),
      Order.find({})
        .populate('user')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(safeLimit),
    ])

    return {
      orders,
      pagination: {
        page: safePage,
        limit: safeLimit,
        total,
        totalPages: Math.ceil(total / safeLimit) || 0,
      },
    }
  }

  async getSalesStats() {
    const date = new Date()
    const today = new Date(date.getFullYear(), date.getMonth(), date.getDate())

    const [orders, saleToday] = await Promise.all([
      Order.aggregate([
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
        { $match: { createdAt: { $gte: today } } },
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
      throw new Error('Order not found')
    }
    if (order.status === 'cancelled') {
      const err = new Error('Cancelled orders cannot be updated')
      err.statusCode = 400
      throw err
    }
    if (!ALLOWED_ORDER_STATUSES.includes(status)) {
      const err = new Error('Invalid order status')
      err.statusCode = 400
      throw err
    }

    const update = { status }
    if (status === 'delivered') {
      update.deliveredAt = order.deliveredAt || new Date()
    }

    return Order.findByIdAndUpdate(orderId, update, { new: true })
  }

  async restoreStockForCancelledItems(items) {
    for (const item of normalizeOrderItems(items)) {
      if (!item._id) continue
      await releaseStock(item._id, item.qty)
    }
  }

  async cancelForUser(userId, orderId) {
    const order = await Order.findById(orderId)
    if (!order) {
      throw new Error('Order not found')
    }
    this.assertUserCanAccess(order, userId)

    if (!canCancelOrder(order)) {
      throw new Error(
        'This order cannot be cancelled. Only pending or processing orders can be cancelled before they ship.'
      )
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

    if (order.postPaymentProcessed) {
      await this.restoreStockForCancelledItems(order.orderItems)
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

  async retrieveStripeSession(sessionId) {
    return getStripeClient().checkout.sessions.retrieve(sessionId)
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

    if (existingOrder.paymentStatus === 'paid') {
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
      throw new Error('Session not found')
    }

    const orderId = parseOrderId(session.metadata?.orderId)
    if (!orderId) {
      throw new Error('No order associated with this session')
    }

    const existingOrder = await Order.findById(orderId)
    if (!existingOrder) {
      throw new Error('Order not found')
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
      'confirmationEmailSent postPaymentProcessed paymentStatus orderNumber'
    )

    return {
      order: updatedOrder,
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
      throw new Error('Session not found')
    }

    const orderId = parseOrderId(session.metadata?.orderId)
    if (!orderId) {
      throw new Error('No order associated with this session')
    }

    const order = await Order.findById(orderId)
    if (!order) {
      throw new Error('Order not found')
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
