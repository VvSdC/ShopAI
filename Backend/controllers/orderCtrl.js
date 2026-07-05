import asyncHandler from 'express-async-handler'
import User, { USER_CHECKOUT_SELECT } from '../model/User.js'
import { AppError } from '../utils/appError.js'
import { createCheckoutSession } from '../services/orderCheckout.js'
import {
  pollOrderPaymentStatus,
  expireOrderCheckoutSession,
} from '../services/orderPaymentPollService.js'
import { orderService } from '../services/orderService.js'

export const createOrderCtrl = asyncHandler(async (req, res) => {
  const couponCode = req?.query?.coupon
  const { orderItems, shippingAddress } = req.body

  const user = await User.findById(req.userAuthId).select(USER_CHECKOUT_SELECT)
  if (!user?.hasShippingAddress && !shippingAddress) {
    throw new AppError('Please provide shipping address', 400)
  }
  if (orderItems?.length <= 0) {
    throw new AppError('No Order Items', 400)
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

export const verifyPaymentCtrl = asyncHandler(async (req, res) => {
  const result = await orderService.verifyPaymentForUser(
    req.userAuthId,
    req.params.session_id
  )

  res.json({
    success: true,
    message: 'Payment verified',
    order: result.order,
    confirmationEmailSent: result.confirmationEmailSent,
    emailTo: result.emailTo,
    emailError: result.emailError,
    alreadyProcessed: result.alreadyProcessed,
  })
})

export const resendConfirmationCtrl = asyncHandler(async (req, res) => {
  const result = await orderService.resendConfirmationForUser(
    req.userAuthId,
    req.params.session_id
  )

  if (!result.success) {
    const statusCode = result.error?.includes('Maximum') ? 429 : 502
    throw new AppError(result.error || 'Failed to send confirmation email', statusCode)
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

export const getUserOrdersCtrl = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1
  const limit = parseInt(req.query.limit) || 5

  const { orders, pagination } = await orderService.listForUser(req.userAuthId, {
    page,
    limit,
  })

  res.json({
    success: true,
    message: 'User orders',
    orders,
    pagination,
  })
})

export const getAllordersCtrl = asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit, 10) || 5
  const cursor = req.query.cursor || null

  const { orders, pagination } = await orderService.listAll({ limit, cursor })

  res.json({
    success: true,
    message: 'All orders',
    orders,
    pagination,
  })
})

export const getSingleOrderCtrl = asyncHandler(async (req, res) => {
  const order = await orderService.getForUserOrAdmin(req.params.id, req.userAuthId)
  res.status(200).json({
    success: true,
    message: 'Single order',
    order,
  })
})

export const updateOrderCtrl = asyncHandler(async (req, res) => {
  const updatedOrder = await orderService.updateStatus(req.params.id, req.body.status)
  res.status(200).json({
    success: true,
    message: 'Order updated',
    updatedOrder,
  })
})

export const getOrderStatsCtrl = asyncHandler(async (req, res) => {
  const { orders, saleToday } = await orderService.getSalesStats()
  res.status(200).json({
    success: true,
    message: 'Sum of orders',
    orders,
    saleToday,
  })
})

export const cancelOrderCtrl = asyncHandler(async (req, res) => {
  const result = await orderService.cancelForUser(req.userAuthId, req.params.id)
  res.json({
    success: true,
    message: result.message,
    order: result.order,
    refundAmount: result.refundAmount,
  })
})
