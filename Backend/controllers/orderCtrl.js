import asyncHandler from 'express-async-handler'
import dotenv from 'dotenv'
dotenv.config()
import Stripe from 'stripe'
import Order from '../model/Order.js'
import User from '../model/User.js'
import {
  processPaidOrder,
  resendOrderConfirmation,
  parseOrderId,
} from '../services/orderFulfillment.js'
import { createCheckoutSession } from '../services/orderCheckout.js'
import {
  pollOrderPaymentStatus,
  expireOrderCheckoutSession,
} from '../services/orderPaymentPollService.js'
import { cancelOrderForUser } from '../services/cancelService.js'
import { persistPaymentReferences } from '../services/orderRefund.js'
//@desc create orders
//@route POST /api/v1/orders
//@access private

//stripe instance
const stripe = new Stripe(process.env.STRIPE_KEY)

export const createOrderCtrl = asyncHandler(async (req, res) => {
  const couponCode = req?.query?.coupon
  const { orderItems, shippingAddress } = req.body

  const user = await User.findById(req.userAuthId)
  if (!user?.hasShippingAddress && !shippingAddress) {
    throw new Error('Please provide shipping address')
  }
  if (orderItems?.length <= 0) {
    throw new Error('No Order Items')
  }

  const session = await createCheckoutSession({
    userId: req.userAuthId,
    orderItems,
    shippingAddress,
    couponCode,
    source: 'cart',
  })
  res.send({
    url: session.url,
    orderId: session.orderId,
    orderNumber: session.orderNumber,
    expiresAt: session.expiresAt,
  })
})

export const pollPaymentStatusCtrl = asyncHandler(async (req, res) => {
  const status = await pollOrderPaymentStatus(req.userAuthId, req.params.orderId)
  res.json({ success: true, ...status })
})

export const expireCheckoutCtrl = asyncHandler(async (req, res) => {
  const result = await expireOrderCheckoutSession(req.userAuthId, req.params.orderId)
  res.json({ success: true, ...result })
})

//@desc verify payment by Stripe session ID and update order
//@route GET /api/v1/orders/verify-payment/:session_id
//@access private

export const verifyPaymentCtrl = asyncHandler(async (req, res) => {
  const session = await stripe.checkout.sessions.retrieve(req.params.session_id)
  if (!session) {
    throw new Error('Session not found')
  }
  const orderId = parseOrderId(session.metadata?.orderId)
  if (!orderId) {
    throw new Error('No order associated with this session')
  }

  const receiptEmail =
    session.customer_details?.email || session.customer_email || null

  const existingOrder = await Order.findById(orderId)
  if (!existingOrder) {
    throw new Error('Order not found')
  }
  if (existingOrder.user.toString() !== req.userAuthId.toString()) {
    res.status(403)
    throw new Error('Not authorised to verify this payment')
  }

  const paymentRefs = await persistPaymentReferences(orderId, session)

  const updatedOrder = await Order.findByIdAndUpdate(
    orderId,
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
    fulfillment = await processPaidOrder(orderId, { receiptEmail })
  }

  const refreshedOrder = await Order.findById(orderId).select(
    'confirmationEmailSent postPaymentProcessed paymentStatus orderNumber'
  )

  res.json({
    success: true,
    message: 'Payment verified',
    order: updatedOrder,
    confirmationEmailSent: refreshedOrder?.confirmationEmailSent === true,
    emailTo: fulfillment?.emailTo || receiptEmail,
    emailError: fulfillment?.emailError,
    alreadyProcessed: existingOrder.postPaymentProcessed === true,
  })
})

//@desc resend order confirmation email (paid orders only)
//@route POST /api/v1/orders/resend-confirmation/:session_id
//@access private

export const resendConfirmationCtrl = asyncHandler(async (req, res) => {
  const session = await stripe.checkout.sessions.retrieve(req.params.session_id)
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
  if (order.user.toString() !== req.userAuthId.toString()) {
    res.status(403)
    throw new Error('Not authorised')
  }

  const receiptEmail =
    session.customer_details?.email || session.customer_email || null

  const result = await resendOrderConfirmation(orderId, {
    receiptEmail,
    force: true,
  })

  if (!result.success) {
    res.status(result.error?.includes('Maximum') ? 429 : 502)
    throw new Error(result.error || 'Failed to send confirmation email')
  }

  res.json({
    success: true,
    message: 'Confirmation email sent',
    confirmationEmailSent: true,
    emailTo: result.to,
    provider: result.provider,
    messageId: result.messageId,
  })
})

//@desc get current user's orders (paginated)
//@route GET /api/v1/orders/my-orders
//@access private

export const getUserOrdersCtrl = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1
  const limit = parseInt(req.query.limit) || 5
  const skip = (page - 1) * limit

  const total = await Order.countDocuments({ user: req.userAuthId })
  const orders = await Order.find({ user: req.userAuthId })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)

  res.json({
    success: true,
    message: 'User orders',
    orders,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  })
})

//@desc get all orders
//@route GET /api/v1/orders
//@access private

export const getAllordersCtrl = asyncHandler(async (req, res) => {
  //find all orders
  const orders = await Order.find().populate('user')
  res.json({
    success: true,
    message: 'All orders',
    orders,
  })
})

//@desc get single order
//@route GET /api/v1/orders/:id
//@access private/admin

export const getSingleOrderCtrl = asyncHandler(async (req, res) => {
  const id = req.params.id
  const order = await Order.findById(id)
  if (!order) {
    throw new Error('Order not found')
  }
  const user = await User.findById(req.userAuthId)
  if (order.user.toString() !== req.userAuthId.toString() && !user?.isAdmin) {
    res.status(403)
    throw new Error('Not authorised to view this order')
  }
  res.status(200).json({
    success: true,
    message: 'Single order',
    order,
  })
})

//@desc update order to delivered
//@route PUT /api/v1/orders/update/:id
//@access private/admin

export const updateOrderCtrl = asyncHandler(async (req, res) => {
  const id = req.params.id
  const { status } = req.body

  const order = await Order.findById(id)
  if (!order) {
    throw new Error('Order not found')
  }

  if (order.status === 'cancelled') {
    res.status(400)
    throw new Error('Cancelled orders cannot be updated')
  }

  const allowedStatuses = ['pending', 'processing', 'shipped', 'delivered']
  if (!allowedStatuses.includes(status)) {
    res.status(400)
    throw new Error('Invalid order status')
  }

  const update = { status }
  if (status === 'delivered') {
    update.deliveredAt = order.deliveredAt || new Date()
  }

  const updatedOrder = await Order.findByIdAndUpdate(id, update, { new: true })

  res.status(200).json({
    success: true,
    message: 'Order updated',
    updatedOrder,
  })
})

//@desc get sales sum of orders
//@route GET /api/v1/orders/sales/sum
//@access private/admin

export const getOrderStatsCtrl = asyncHandler(async (req, res) => {
  //get order stats
  const orders = await Order.aggregate([
    {
      $group: {
        _id: null,
        minimumSale: {
          $min: '$totalPrice',
        },
        totalSales: {
          $sum: '$totalPrice',
        },
        maxSale: {
          $max: '$totalPrice',
        },
        avgSale: {
          $avg: '$totalPrice',
        },
      },
    },
  ])
  //get the date
  const date = new Date()
  const today = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const saleToday = await Order.aggregate([
    {
      $match: {
        createdAt: {
          $gte: today,
        },
      },
    },
    {
      $group: {
        _id: null,
        totalSales: {
          $sum: '$totalPrice',
        },
      },
    },
  ])
  //send response
  res.status(200).json({
    success: true,
    message: 'Sum of orders',
    orders,
    saleToday,
  })
})

//@desc cancel order (user)
//@route PUT /api/v1/orders/cancel/:id
//@access private

export const cancelOrderCtrl = asyncHandler(async (req, res) => {
  const result = await cancelOrderForUser(req.userAuthId, req.params.id)
  res.json({
    success: true,
    message: result.message,
    order: result.order,
    refundAmount: result.refundAmount,
  })
})
