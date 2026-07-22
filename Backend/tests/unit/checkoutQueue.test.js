import { describe, it, expect, afterEach } from 'vitest'
import bcrypt from 'bcryptjs'
import Order from '../../model/Order.js'
import User from '../../model/User.js'
import Product from '../../model/Product.js'
import mongoose from 'mongoose'
import {
  expireCheckoutJob,
  enqueueCheckoutExpiry,
  sweepExpiredCheckoutHolds,
  stopCheckoutExpiryFallback,
} from '../../services/checkoutQueue.js'
import { testOrderItem, testShippingAddress } from '../helpers/orderFixtures.js'

afterEach(() => {
  stopCheckoutExpiryFallback()
})

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

  it('releases pre-reserved stock when an unpaid checkout expires', async () => {
    const user = await User.create({
      fullname: 'Reserved Stock User',
      email: `reserved-stock-${Date.now()}@test.com`,
      password: await bcrypt.hash('secret', 10),
    })

    const product = await Product.create({
      name: `Reserved Product ${Date.now()}`,
      description: 'Test',
      brand: new mongoose.Types.ObjectId(),
      category: new mongoose.Types.ObjectId(),
      sizes: ['M'],
      colors: ['Blue'],
      user: user._id,
      images: ['https://example.com/img.jpg'],
      price: 100,
      totalQty: 5,
      totalSold: 3,
    })

    const order = await Order.create({
      user: user._id,
      orderItems: [testOrderItem({ _id: product._id, name: product.name, qty: 2, price: 100 })],
      shippingAddress: testShippingAddress({ address: '3 Test St' }),
      totalPrice: 200,
      paymentStatus: 'Not paid',
      stockReservedAtCheckout: true,
      checkoutExpiresAt: new Date(Date.now() + 5 * 60 * 1000),
    })

    const result = await expireCheckoutJob(order._id)
    expect(result.expired).toBe(true)

    const updatedProduct = await Product.findById(product._id)
    expect(updatedProduct.totalSold).toBe(1)

    const updatedOrder = await Order.findById(order._id)
    expect(updatedOrder.stockReservationReleasedAt).toBeTruthy()
  })

  it('does not double-release stock when expiry runs twice', async () => {
    const user = await User.create({
      fullname: 'Double Release User',
      email: `double-release-${Date.now()}@test.com`,
      password: await bcrypt.hash('secret', 10),
    })

    const product = await Product.create({
      name: `Double Release Product ${Date.now()}`,
      description: 'Test',
      brand: new mongoose.Types.ObjectId(),
      category: new mongoose.Types.ObjectId(),
      sizes: ['M'],
      colors: ['Blue'],
      user: user._id,
      images: ['https://example.com/img.jpg'],
      price: 100,
      totalQty: 5,
      totalSold: 4,
    })

    const order = await Order.create({
      user: user._id,
      orderItems: [testOrderItem({ _id: product._id, name: product.name, qty: 1, price: 100 })],
      shippingAddress: testShippingAddress({ address: '6 Test St' }),
      totalPrice: 100,
      paymentStatus: 'Not paid',
      stockReservedAtCheckout: true,
      checkoutExpiresAt: new Date(Date.now() + 5 * 60 * 1000),
    })

    await expireCheckoutJob(order._id)
    await expireCheckoutJob(order._id)

    const updatedProduct = await Product.findById(product._id)
    expect(updatedProduct.totalSold).toBe(3)
  })
})

describe('checkout expiry without Redis', () => {
  it('sweepExpiredCheckoutHolds releases stock for expired unpaid checkouts', async () => {
    const user = await User.create({
      fullname: 'Sweep User',
      email: `sweep-${Date.now()}@test.com`,
      password: await bcrypt.hash('secret', 10),
    })

    const product = await Product.create({
      name: `Sweep Product ${Date.now()}`,
      description: 'Test',
      brand: new mongoose.Types.ObjectId(),
      category: new mongoose.Types.ObjectId(),
      sizes: ['M'],
      colors: ['Blue'],
      user: user._id,
      images: ['https://example.com/img.jpg'],
      price: 100,
      totalQty: 4,
      totalSold: 4,
    })

    await Order.create({
      user: user._id,
      orderItems: [testOrderItem({ _id: product._id, name: product.name, qty: 1, price: 100 })],
      shippingAddress: testShippingAddress({ address: '4 Test St' }),
      totalPrice: 100,
      paymentStatus: 'Not paid',
      stockReservedAtCheckout: true,
      checkoutExpiresAt: new Date(Date.now() - 60_000),
    })

    const result = await sweepExpiredCheckoutHolds()
    expect(result.processed).toBe(1)

    const updatedProduct = await Product.findById(product._id)
    expect(updatedProduct.totalSold).toBe(3)
  })

  it('enqueueCheckoutExpiry uses in-process scheduling when BullMQ is disabled', async () => {
    const user = await User.create({
      fullname: 'Timer User',
      email: `timer-${Date.now()}@test.com`,
      password: await bcrypt.hash('secret', 10),
    })

    const order = await Order.create({
      user: user._id,
      orderItems: [testOrderItem({ name: 'Timer Hat', price: 25 })],
      shippingAddress: testShippingAddress({ address: '5 Test St' }),
      totalPrice: 25,
      paymentStatus: 'Not paid',
      checkoutExpiresAt: new Date(Date.now() + 5 * 60 * 1000),
    })

    const scheduled = await enqueueCheckoutExpiry(order._id, 60_000)
    expect(scheduled).toBe(true)
  })
})
