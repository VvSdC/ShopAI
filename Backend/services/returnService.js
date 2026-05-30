import ReturnRequest from '../model/ReturnRequest.js'
import Order from '../model/Order.js'
import Product from '../model/Product.js'
import {
  STORE_POLICY,
  isWithinReturnWindow,
} from '../config/storePolicy.js'
import { RETURN_REASON_CODES } from '../constants/returnReasons.js'
import {
  normalizeOrderItems,
  findOrderLine,
  getActiveQty,
  computeRefundTotal,
  productIdKey,
} from './orderLineItems.js'
import { createStripeRefund } from './orderRefund.js'

function validateReasonItem(item) {
  if (!RETURN_REASON_CODES.has(item.reasonCode)) {
    throw new Error('Invalid return reason')
  }
  if (item.reasonCode === 'other') {
    const comment = String(item.reasonComment || '').trim()
    if (comment.length < 3) {
      throw new Error('Please describe your reason when selecting "Other"')
    }
    if (comment.length > 500) {
      throw new Error('Reason comment is too long (max 500 characters)')
    }
  }
}

export function getReturnEligibility(order) {
  const normalized = normalizeOrderItems(order.orderItems)
  const reasons = []

  if (!STORE_POLICY.returns.enabled) {
    return { eligible: false, message: 'Returns are not available at this time.', lines: [] }
  }
  if (order.status !== 'delivered') {
    return {
      eligible: false,
      message: 'Returns are available only after your order is marked delivered.',
      lines: [],
    }
  }
  if (!order.deliveredAt) {
    return {
      eligible: false,
      message: 'Delivery date is not recorded yet. Please contact support.',
      lines: [],
    }
  }
  if (!isWithinReturnWindow(order.deliveredAt)) {
    return {
      eligible: false,
      message: `The return window is ${STORE_POLICY.returns.windowDays} days from delivery. That window has closed for this order.`,
      lines: [],
    }
  }

  const lines = normalized
    .map((item) => {
      const returnableQty = getActiveQty(item)
      return {
        lineId: item.lineId,
        productId: productIdKey(item._id),
        name: item.name,
        color: item.color,
        size: item.size,
        price: item.price,
        returnableQty,
      }
    })
    .filter((line) => line.returnableQty > 0)

  if (!lines.length) {
    return {
      eligible: false,
      message: 'All items on this order have already been returned or cancelled.',
      lines: [],
    }
  }

  const windowEnd = new Date(order.deliveredAt)
  windowEnd.setDate(windowEnd.getDate() + STORE_POLICY.returns.windowDays)

  return {
    eligible: true,
    message: `You can return items until ${windowEnd.toLocaleDateString('en-IN')}.`,
    windowEndsAt: windowEnd,
    lines,
  }
}

export async function createReturnRequest(userId, orderId, items) {
  const order = await Order.findById(orderId)
  if (!order) throw new Error('Order not found')
  if (order.user.toString() !== userId.toString()) {
    throw new Error('Not authorised to return this order')
  }

  const eligibility = getReturnEligibility(order)
  if (!eligibility.eligible) {
    throw new Error(eligibility.message)
  }

  const pending = await ReturnRequest.findOne({
    order: orderId,
    status: 'requested',
  })
  if (pending) {
    throw new Error(
      'You already have a pending return request for this order. Wait for admin review or contact support.'
    )
  }

  if (!items?.length) {
    throw new Error('Select at least one item to return')
  }

  const lineQtyMap = {}
  const returnItems = []

  for (const entry of items) {
    const line = findOrderLine(order, entry.lineId)
    if (!line) throw new Error('Invalid item selected for return')

    const qty = Number(entry.qty) || 0
    if (qty < 1) throw new Error('Return quantity must be at least 1')

    const returnableQty = getActiveQty(line)
    if (qty > returnableQty) {
      throw new Error(`Cannot return ${qty} of ${line.name}. Only ${returnableQty} eligible.`)
    }

    validateReasonItem(entry)

    lineQtyMap[entry.lineId] = qty
    returnItems.push({
      lineId: line.lineId,
      productId: productIdKey(line._id),
      name: line.name,
      qty,
      unitPrice: line.price,
      color: line.color || '',
      size: line.size || '',
      reasonCode: entry.reasonCode,
      reasonComment: String(entry.reasonComment || '').trim(),
    })
  }

  const refundAmount = computeRefundTotal(order, lineQtyMap)

  const request = await ReturnRequest.create({
    user: userId,
    order: order._id,
    orderNumber: order.orderNumber,
    items: returnItems,
    refundAmount,
    status: 'requested',
  })

  return {
    request,
    message: STORE_POLICY.returns.adminApprovalRequired
      ? 'Return request submitted. Our team will review it shortly.'
      : 'Return request submitted.',
  }
}

async function restoreStockForReturnItems(items) {
  for (const item of items) {
    const product = await Product.findById(item.productId)
    if (product) {
      product.totalSold = Math.max(0, product.totalSold - (item.qty || 1))
      await product.save()
    }
  }
}

export async function approveReturnRequest(adminId, requestId, adminNote = '') {
  const request = await ReturnRequest.findById(requestId)
  if (!request) throw new Error('Return request not found')
  if (request.status !== 'requested') {
    throw new Error('Only pending return requests can be approved')
  }

  const order = await Order.findById(request.order)
  if (!order) throw new Error('Order not found')

  const lineQtyMap = {}
  for (const item of request.items) {
    lineQtyMap[item.lineId] = item.qty
  }

  const refundAmount = computeRefundTotal(order, lineQtyMap)

  let stripeRefundId = null
  if (order.paymentStatus === 'paid' && refundAmount > 0) {
    const refund = await createStripeRefund(order, refundAmount)
    stripeRefundId = refund.id
  }

  const normalized = normalizeOrderItems(order.orderItems)
  order.orderItems = normalized.map((line) => {
    const ret = request.items.find((r) => r.lineId === line.lineId)
    if (!ret) return line
    const newReturned = (line.returnedQty || 0) + ret.qty
    const active = getActiveQty(line) - ret.qty
    return {
      ...line,
      returnedQty: newReturned,
      lineStatus: active <= 0 ? 'returned' : line.lineStatus,
    }
  })

  order.totalRefunded = (order.totalRefunded || 0) + refundAmount
  order.refundStatus =
    order.totalRefunded >= (order.totalPrice || 0) - 0.01 ? 'full' : 'partial'
  if (stripeRefundId) {
    order.stripeRefundIds = [...(order.stripeRefundIds || []), stripeRefundId]
  }

  await order.save()

  if (order.postPaymentProcessed) {
    await restoreStockForReturnItems(request.items)
  }

  request.status = 'refunded'
  request.refundAmount = refundAmount
  request.stripeRefundId = stripeRefundId
  request.adminNote = adminNote || ''
  request.resolvedAt = new Date()
  request.resolvedBy = adminId
  await request.save()

  return {
    request,
    refundAmount,
    message: `Return approved. Refund of ₹${refundAmount.toLocaleString('en-IN')} processed.`,
  }
}

export async function rejectReturnRequest(adminId, requestId, adminNote) {
  const request = await ReturnRequest.findById(requestId)
  if (!request) throw new Error('Return request not found')
  if (request.status !== 'requested') {
    throw new Error('Only pending return requests can be rejected')
  }
  if (!String(adminNote || '').trim()) {
    throw new Error('Please provide a reason for rejection')
  }

  request.status = 'rejected'
  request.adminNote = String(adminNote).trim()
  request.resolvedAt = new Date()
  request.resolvedBy = adminId
  await request.save()

  return { request, message: 'Return request rejected.' }
}

export async function listReturnRequestsForUser(userId) {
  return ReturnRequest.find({ user: userId }).sort({ createdAt: -1 })
}

export async function listAllReturnRequests(status) {
  const filter = status ? { status } : {}
  return ReturnRequest.find(filter)
    .populate('user', 'fullname email')
    .sort({ createdAt: -1 })
}

export async function getReturnReasonStats() {
  const pipeline = [
    { $match: { status: { $in: ['refunded', 'requested', 'approved'] } } },
    { $unwind: '$items' },
    {
      $group: {
        _id: '$items.reasonCode',
        count: { $sum: '$items.qty' },
        requests: { $sum: 1 },
      },
    },
    { $sort: { count: -1 } },
  ]
  return ReturnRequest.aggregate(pipeline)
}
