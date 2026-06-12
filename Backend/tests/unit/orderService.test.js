import { describe, it, expect, vi, beforeEach } from 'vitest'
import mongoose from 'mongoose'
import Order from '../../model/Order.js'
import User from '../../model/User.js'

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
      orderItems: [{ name: 'Ball', price: 100, qty: 1, _id: new mongoose.Types.ObjectId() }],
      shippingAddress: { address: '1 Test St', city: 'Test', country: 'IN' },
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
      orderItems: [{ name: 'Hat', price: 50, qty: 1 }],
      shippingAddress: { address: '1 Test St', city: 'Test', country: 'IN' },
      totalPrice: 50,
      paymentStatus: 'paid',
      status: 'cancelled',
    })

    await expect(orderService.updateStatus(order._id, 'processing')).rejects.toMatchObject({
      statusCode: 400,
      message: expect.stringMatching(/cancelled/i),
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
