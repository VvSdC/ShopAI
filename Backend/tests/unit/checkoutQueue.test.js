import { describe, it, expect } from 'vitest'
import bcrypt from 'bcryptjs'
import mongoose from 'mongoose'
import Order from '../../model/Order.js'
import User from '../../model/User.js'
import { expireCheckoutJob } from '../../services/checkoutQueue.js'
import { testOrderItem, testShippingAddress } from '../helpers/orderFixtures.js'

describe('expireCheckoutJob', () => {
  it('skips expiry when order is already paid', async () => {
    const user = await User.create({
      fullname: 'Paid Order User',
      email: `paid-order-${Date.now()}@test.com`,
      password: await bcrypt.hash('secret', 10),
    })

    const order = await Order.create({
      user: user._id,
      orderItems: [testOrderItem({ name: 'Shirt', price: 100 })],
      shippingAddress: testShippingAddress(),
      totalPrice: 100,
      paymentStatus: 'paid',
      stripeSessionId: 'cs_test_paid_skip',
      checkoutExpiresAt: new Date(Date.now() + 60_000),
    })

    const result = await expireCheckoutJob(order._id)
    expect(result.skipped).toBe(true)
    expect(result.reason).toBe('already_paid')
  })

  it('marks checkoutExpiresAt when order is still unpaid', async () => {
    const user = await User.create({
      fullname: 'Pending Order User',
      email: `pending-order-${Date.now()}@test.com`,
      password: await bcrypt.hash('secret', 10),
    })

    const futureExpiry = new Date(Date.now() + 5 * 60 * 1000)
    const order = await Order.create({
      user: user._id,
      orderItems: [testOrderItem({ name: 'Hat', price: 50 })],
      shippingAddress: testShippingAddress({ address: '2 Test St' }),
      totalPrice: 50,
      paymentStatus: 'Not paid',
      stripeSessionId: null,
      checkoutExpiresAt: futureExpiry,
    })

    const result = await expireCheckoutJob(order._id)
    expect(result.expired).toBe(true)

    const reloaded = await Order.findById(order._id)
    expect(reloaded.checkoutExpiresAt.getTime()).toBeLessThanOrEqual(Date.now())
  })
})
