import asyncHandler from 'express-async-handler'
import Order from '../model/Order.js'
import { RETURN_REASONS } from '../constants/returnReasons.js'
import {
  getReturnEligibility,
  createReturnRequest,
  approveReturnRequest,
  rejectReturnRequest,
  listReturnRequestsForUser,
  listAllReturnRequests,
  getReturnReasonStats,
} from '../services/returnService.js'

export const getReturnReasonsCtrl = asyncHandler(async (req, res) => {
  res.json({ success: true, reasons: RETURN_REASONS })
})

export const getMyReturnsCtrl = asyncHandler(async (req, res) => {
  const requests = await listReturnRequestsForUser(req.userAuthId)
  res.json({ success: true, requests })
})

export const getOrderReturnEligibilityCtrl = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.orderId)
  if (!order) throw new Error('Order not found')
  if (order.user.toString() !== req.userAuthId.toString()) {
    res.status(403)
    throw new Error('Not authorised')
  }
  const eligibility = getReturnEligibility(order)
  res.json({ success: true, ...eligibility })
})

export const createReturnCtrl = asyncHandler(async (req, res) => {
  const result = await createReturnRequest(
    req.userAuthId,
    req.params.orderId,
    req.body.items
  )
  res.status(201).json({
    success: true,
    message: result.message,
    request: result.request,
  })
})

export const listAllReturnsCtrl = asyncHandler(async (req, res) => {
  const status = req.query.status || null
  const requests = await listAllReturnRequests(status)
  res.json({ success: true, requests })
})

export const approveReturnCtrl = asyncHandler(async (req, res) => {
  const result = await approveReturnRequest(
    req.userAuthId,
    req.params.id,
    req.body.adminNote || ''
  )
  res.json({
    success: true,
    message: result.message,
    request: result.request,
    refundAmount: result.refundAmount,
  })
})

export const rejectReturnCtrl = asyncHandler(async (req, res) => {
  const result = await rejectReturnRequest(
    req.userAuthId,
    req.params.id,
    req.body.adminNote
  )
  res.json({
    success: true,
    message: result.message,
    request: result.request,
  })
})

export const getReturnStatsCtrl = asyncHandler(async (req, res) => {
  const stats = await getReturnReasonStats()
  res.json({ success: true, stats })
})
