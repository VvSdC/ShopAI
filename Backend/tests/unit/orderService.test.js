import { describe, it, expect, vi, beforeEach } from 'vitest'
import mongoose from 'mongoose'
import Order from '../../model/Order.js'
import User from '../../model/User.js'
import { testOrderItem, testShippingAddress } from '../helpers/orderFixtures.js'
import { createTestBrand } from '../helpers/testBrand.js'

const processPaidOrder = vi.fn()
const clearCart = vi.fn().mockResolvedValue({ items: [], isEmpty: true })

vi.mock('../../services/orderRefund.js', () => ({
  createStripeRefund: vi.fn().mockResolvedValue({ id: 're_test' }),
  persistPaymentReferences: vi.fn().mockResolvedValue({}),
}))

vi.mock('../../services/cartService.js', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    clearCart: (...args) => clearCart(...args),
  }
})

vi.mock('../../services/orderFulfillment.js', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    processPaidOrder: (...args) => processPaidOrder(...args),
  }
})

import { orderService } from '../../services/orderService.js'
import Product from '../../model/Product.js'
import { atomicallyReserveStock } from '../../services/stockService.js'
import { createStripeRefund } from '../../services/orderRefund.js'

describe('orderService', () => {
  beforeEach(() => {
    processPaidOrder.mockReset()
    clearCart.mockClear()
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
    expect(clearCart).toHaveBeenCalledWith(user._id)

    const unchanged = await Order.findById(order._id)
    expect(unchanged.paymentStatus).toBe('paid')
    expect(unchanged.postPaymentProcessed).toBe(true)
  })

  it('runs fulfillment only once when checkout payment races', async () => {
    processPaidOrder.mockResolvedValue({ processed: true, emailSent: true })

    const user = await User.create({
      fullname: 'Race Payment User',
      email: `race-payment-${Date.now()}@test.com`,
      password: 'hashed',
    })

    const order = await Order.create({
      user: user._id,
      orderItems: [testOrderItem({ name: 'Race Ball', price: 100 })],
      shippingAddress: testShippingAddress(),
      totalPrice: 100,
      paymentStatus: 'Not paid',
      stripeSessionId: 'cs_test_race',
    })

    const session = {
      id: 'cs_test_race',
      amount_total: 10000,
      currency: 'inr',
      payment_method_types: ['card'],
      payment_status: 'paid',
      payment_intent: 'pi_race',
    }

    const first = await orderService.applyStripeCheckoutSession(order._id, session)
    const second = await orderService.applyStripeCheckoutSession(order._id, session)

    expect(processPaidOrder).toHaveBeenCalledTimes(1)
    expect(first.fulfillment).toBeTruthy()
    expect(second.alreadyPaid).toBe(true)
    expect(second.fulfillment).toBeNull()
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

  it('allows admins to view orders after the owner account is deleted', async () => {
    const admin = await User.create({
      fullname: 'Admin User',
      email: `admin-orphan-${Date.now()}@test.com`,
      password: 'hashed',
      isAdmin: true,
    })
    const owner = await User.create({
      fullname: 'Deleted Owner',
      email: `deleted-owner-${Date.now()}@test.com`,
      password: 'hashed',
    })

    const order = await Order.create({
      user: owner._id,
      orderItems: [testOrderItem({ name: 'Ball', price: 100 })],
      shippingAddress: testShippingAddress(),
      totalPrice: 100,
    })
    await Order.updateOne({ _id: order._id }, { $unset: { user: '' } })

    const result = await orderService.getForUserOrAdmin(order._id, admin._id)
    expect(result._id.toString()).toBe(order._id.toString())
  })

  it('rejects non-admins for orders with a deleted owner account', async () => {
    const owner = await User.create({
      fullname: 'Deleted Owner 2',
      email: `deleted-owner-2-${Date.now()}@test.com`,
      password: 'hashed',
    })
    const other = await User.create({
      fullname: 'Other User',
      email: `other-orphan-${Date.now()}@test.com`,
      password: 'hashed',
    })

    const order = await Order.create({
      user: owner._id,
      orderItems: [testOrderItem({ name: 'Bat', price: 80 })],
      shippingAddress: testShippingAddress(),
      totalPrice: 80,
    })
    await Order.updateOne({ _id: order._id }, { $unset: { user: '' } })

    await expect(orderService.getForUserOrAdmin(order._id, other._id)).rejects.toMatchObject({
      statusCode: 403,
      message: 'Not authorised to view this order',
      isOperational: true,
    })
  })

  it('counts only paid, non-cancelled orders in sales stats', async () => {
    const { orders: beforeOrders } = await orderService.getSalesStats()
    const baselineTotal = beforeOrders[0]?.totalSales ?? 0

    const user = await User.create({
      fullname: 'Stats User',
      email: `stats-${Date.now()}@test.com`,
      password: 'hashed',
    })

    await Order.create({
      user: user._id,
      orderItems: [testOrderItem({ name: 'Paid', price: 100 })],
      shippingAddress: testShippingAddress(),
      totalPrice: 100,
      paymentStatus: 'paid',
      status: 'processing',
    })
    await Order.create({
      user: user._id,
      orderItems: [testOrderItem({ name: 'Unpaid', price: 200 })],
      shippingAddress: testShippingAddress(),
      totalPrice: 200,
      paymentStatus: 'Not paid',
      status: 'pending',
    })
    await Order.create({
      user: user._id,
      orderItems: [testOrderItem({ name: 'Cancelled', price: 300 })],
      shippingAddress: testShippingAddress(),
      totalPrice: 300,
      paymentStatus: 'paid',
      status: 'cancelled',
    })

    const { orders } = await orderService.getSalesStats()
    expect(orders[0].totalSales).toBe(baselineTotal + 100)
  })

  it('restoreStockForCancelledItems releases active line quantities', async () => {
    const user = await User.create({
      fullname: 'Restore Lines User',
      email: `restore-lines-${Date.now()}@test.com`,
      password: 'hashed',
    })

    const brand = await createTestBrand('testbrand-restore', user)

    const product = await Product.create({
      name: 'Restore Lines Product',
      description: 'Test',
      brand: brand._id,
      category: new mongoose.Types.ObjectId(),
      sizes: ['M'],
      colors: ['Blue'],
      user: user._id,
      images: ['https://example.com/img.jpg'],
      price: 100,
      totalQty: 23,
      totalSold: 2,
    })

    const order = await Order.create({
      user: user._id,
      orderItems: [
        testOrderItem({
          _id: product._id,
          name: product.name,
          qty: 2,
          price: 100,
          totalPrice: 200,
        }),
      ],
      shippingAddress: testShippingAddress(),
      totalPrice: 200,
      paymentStatus: 'paid',
      postPaymentProcessed: true,
      status: 'pending',
    })

    const loaded = await Order.findById(order._id)
    await orderService.restoreStockForCancelledItems(loaded.orderItems)

    const refreshed = await Product.findById(product._id)
    expect(String(loaded.orderItems[0]._id)).toBe(String(product._id))
    expect(refreshed.totalSold).toBe(0)
  })

  it('restores stock when a paid order is cancelled', async () => {
    const user = await User.create({
      fullname: 'Cancel Stock User',
      email: `cancel-stock-${Date.now()}@test.com`,
      password: 'hashed',
    })

    const brand = await createTestBrand('testbrand-cancel', user)

    const product = await Product.create({
      name: 'Cancel Stock Product',
      description: 'Test',
      brand: brand._id,
      category: new mongoose.Types.ObjectId(),
      sizes: ['M'],
      colors: ['Blue'],
      user: user._id,
      images: ['https://example.com/img.jpg'],
      price: 100,
      totalQty: 23,
      totalSold: 0,
    })

    await atomicallyReserveStock(product._id, 2)

    const order = await Order.create({
      user: user._id,
      orderItems: [
        testOrderItem({
          _id: product._id,
          name: product.name,
          qty: 2,
          price: 100,
          totalPrice: 200,
        }),
      ],
      shippingAddress: testShippingAddress(),
      totalPrice: 200,
      paymentStatus: 'paid',
      postPaymentProcessed: true,
      status: 'pending',
    })

    await orderService.cancelForUser(user._id, order._id)

    const refreshed = await Product.findById(product._id)
    expect(refreshed.totalSold).toBe(0)
    expect(refreshed.totalQty - refreshed.totalSold).toBe(23)
  })

  it('refunds Stripe checkout when payment completes on a cancelled order', async () => {
    const user = await User.create({
      fullname: 'Cancelled Fulfillment User',
      email: `cancel-fulfill-${Date.now()}@test.com`,
      password: 'hashed',
    })

    const order = await Order.create({
      user: user._id,
      orderItems: [testOrderItem({ name: 'Cancelled Item', price: 50 })],
      shippingAddress: testShippingAddress(),
      totalPrice: 50,
      paymentStatus: 'Not paid',
      status: 'cancelled',
      stockReservedAtCheckout: true,
    })

    const result = await orderService.applyStripeCheckoutSession(order._id, {
      id: 'cs_test_cancelled',
      amount_total: 5000,
      currency: 'inr',
      payment_method_types: ['card'],
      payment_status: 'paid',
      payment_intent: 'pi_test_cancelled',
    })

    expect(result.reason).toBe('order_cancelled_paid_refunded')
    expect(result.refundAmount).toBe(50)
    expect(createStripeRefund).toHaveBeenCalled()
    expect(processPaidOrder).not.toHaveBeenCalled()

    const updated = await Order.findById(order._id)
    expect(updated.paymentStatus).toBe('paid')
    expect(updated.status).toBe('cancelled')
    expect(updated.refundStatus).toBe('full')
    expect(updated.totalRefunded).toBe(50)
  })

  it('rejects cancel while checkout session is still open', async () => {
    const user = await User.create({
      fullname: 'Open Checkout User',
      email: `open-checkout-${Date.now()}@test.com`,
      password: 'hashed',
    })

    const order = await Order.create({
      user: user._id,
      orderItems: [testOrderItem({ name: 'Pending Item', price: 40 })],
      shippingAddress: testShippingAddress(),
      totalPrice: 40,
      paymentStatus: 'Not paid',
      status: 'pending',
      stripeSessionId: 'cs_test_open',
      checkoutExpiresAt: new Date(Date.now() + 5 * 60 * 1000),
    })

    await expect(orderService.cancelForUser(user._id, order._id)).rejects.toMatchObject({
      statusCode: 400,
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
