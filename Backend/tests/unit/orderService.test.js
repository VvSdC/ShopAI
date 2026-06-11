import { describe, it, expect } from 'vitest'
import mongoose from 'mongoose'
import Order from '../../model/Order.js'
import User from '../../model/User.js'
import { orderService } from '../../services/orderService.js'

describe('orderService', () => {
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
