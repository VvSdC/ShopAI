import { describe, it, expect, vi, beforeEach } from 'vitest'
import mongoose from 'mongoose'
import Order from '../../model/Order.js'
import User from '../../model/User.js'
import { testOrderItem, testShippingAddress } from '../helpers/orderFixtures.js'

const processPaidOrder = vi.fn()

vi.mock('../../services/orderFulfillment.js', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    processPaidOrder: (...args) => processPaidOrder(...args),
  }
})

import { orderService } from '../../services/orderService.js'

describe('orderService', () => {
  beforeEach(() => {
    processPaidOrder.mockReset()
  })

  it('skips fulfillment when order is already paid (webhook idempotency)', async () => {
    const user = await User.create({
      fullname: 'Paid Webhook User',
      email: `paid-webhook-${Date.now()}@test.com`,
      password: 'hashed',
    })

    const order = await Order.create({
      user: user._id,
      orderItems: [testOrderItem({ name: 'Ball', price: 100 })],
      shippingAddress: testShippingAddress(),
      totalPrice: 100,
      paymentStatus: 'paid',
      postPaymentProcessed: true,
      stripeSessionId: 'cs_test_already_paid',
    })

    const result = await orderService.applyStripeCheckoutSession(order._id, {
      id: 'cs_test_already_paid',
      amount_total: 10000,
      currency: 'inr',
      payment_method_types: ['card'],
      payment_status: 'paid',
      payment_intent: 'pi_test_123',
    })

    expect(result.alreadyPaid).toBe(true)
    expect(result.fulfillment).toBeNull()
    expect(result.updatedOrder._id.toString()).toBe(order._id.toString())
    expect(processPaidOrder).not.toHaveBeenCalled()

    const unchanged = await Order.findById(order._id)
    expect(unchanged.paymentStatus).toBe('paid')
    expect(unchanged.postPaymentProcessed).toBe(true)
  })

  it('rejects status updates for cancelled orders', async () => {
    const user = await User.create({
      fullname: 'Order Service User',
      email: `order-svc-${Date.now()}@test.com`,
      password: 'hashed',
    })

    const order = await Order.create({
      user: user._id,
      orderItems: [testOrderItem({ name: 'Hat', price: 50 })],
      shippingAddress: testShippingAddress(),
      totalPrice: 50,
      paymentStatus: 'paid',
      status: 'cancelled',
    })

    await expect(orderService.updateStatus(order._id, 'processing')).rejects.toMatchObject({
      statusCode: 400,
      message: expect.stringMatching(/cancelled/i),
    })
  })

  it('paginates admin listAll with cursor-based pagination', async () => {
    const totalBefore = await Order.countDocuments({})
    const user = await User.create({
      fullname: 'Admin List User',
      email: `admin-list-${Date.now()}@test.com`,
      password: 'hashed',
    })

    for (let i = 0; i < 3; i++) {
      await Order.create({
          user: user._id,
          orderItems: [testOrderItem({ name: `Item ${i}`, price: 10 + i })],
          shippingAddress: testShippingAddress(),
          totalPrice: 10 + i,
      })
    }

    const expectedTotal = totalBefore + 3
    const page1 = await orderService.listAll({ limit: 2 })
    expect(page1.orders).toHaveLength(2)
    expect(page1.pagination).toEqual({
      limit: 2,
      total: expectedTotal,
      hasMore: true,
      nextCursor: expect.any(String),
    })

    const page2 = await orderService.listAll({
      limit: 2,
      cursor: page1.pagination.nextCursor,
    })
    expect(page2.orders).toHaveLength(Math.min(2, expectedTotal - 2))
    expect(page2.pagination.hasMore).toBe(expectedTotal > 4)
    expect(page2.pagination.nextCursor).toEqual(
      expectedTotal > 4 ? expect.any(String) : null
    )

    const idsPage1 = page1.orders.map((o) => String(o._id))
    const idsPage2 = page2.orders.map((o) => String(o._id))
    expect(idsPage1.some((id) => idsPage2.includes(id))).toBe(false)
  })

  it('rejects invalid admin listAll cursor', async () => {
    await expect(orderService.listAll({ cursor: 'not-a-cursor' })).rejects.toMatchObject({
      statusCode: 400,
      message: 'Invalid pagination cursor',
    })
  })

  it('throws AppError 404 when order is missing', async () => {
    const user = await User.create({
      fullname: 'Missing Order User',
      email: `missing-order-${Date.now()}@test.com`,
      password: 'hashed',
    })

    const missingId = new mongoose.Types.ObjectId()

    await expect(orderService.getForUserOrAdmin(missingId, user._id)).rejects.toMatchObject({
      statusCode: 404,
      message: 'Order not found',
      isOperational: true,
    })
  })

  it('throws AppError 403 when user cannot access another customers order', async () => {
    const owner = await User.create({
      fullname: 'Order Owner',
      email: `order-owner-${Date.now()}@test.com`,
      password: 'hashed',
    })
    const other = await User.create({
      fullname: 'Other User',
      email: `order-other-${Date.now()}@test.com`,
      password: 'hashed',
    })

    const order = await Order.create({
      user: owner._id,
      orderItems: [testOrderItem({ name: 'Hat', price: 50 })],
      shippingAddress: testShippingAddress(),
      totalPrice: 50,
    })

    await expect(orderService.getForUserOrAdmin(order._id, other._id)).rejects.toMatchObject({
      statusCode: 403,
      message: 'Not authorised to view this order',
      isOperational: true,
    })
  })

  it('formats chat order summaries consistently', () => {
    const formatted = orderService.formatOrderForChat({
      _id: new mongoose.Types.ObjectId(),
      orderNumber: 'ORD-100',
      status: 'processing',
      paymentStatus: 'paid',
      totalPrice: 999,
      orderItems: [{ name: 'Shirt', qty: 1, price: 999 }],
      createdAt: new Date('2026-01-01'),
    })

    expect(formatted.orderNumber).toBe('ORD-100')
    expect(formatted.items).toHaveLength(1)
    expect(formatted.currency).toBe('INR')
  })
})
