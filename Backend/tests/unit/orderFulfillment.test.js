import { describe, it, expect, beforeEach, vi } from 'vitest'
import mongoose from 'mongoose'
import Order from '../../model/Order.js'
import User from '../../model/User.js'
import Product from '../../model/Product.js'
import Cart from '../../model/Cart.js'
import { processPaidOrder } from '../../services/orderFulfillment.js'
import { testOrderItem, testShippingAddress } from '../helpers/orderFixtures.js'

const createStripeRefund = vi.fn()
const sendOrderStockUnavailableRefundEmail = vi.fn()

vi.mock('../../services/orderRefund.js', () => ({
  createStripeRefund: (...args) => createStripeRefund(...args),
}))

vi.mock('../../services/emailService.js', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    sendOrderConfirmationEmail: vi.fn(async () => ({ success: true, provider: 'test' })),
    sendOrderStockUnavailableRefundEmail: (...args) =>
      sendOrderStockUnavailableRefundEmail(...args),
  }
})

describe('processPaidOrder', () => {
  beforeEach(async () => {
    createStripeRefund.mockReset()
    sendOrderStockUnavailableRefundEmail.mockReset()
    createStripeRefund.mockResolvedValue({ id: 're_test_refund' })
    sendOrderStockUnavailableRefundEmail.mockResolvedValue({ success: true, provider: 'test' })
    await Cart.deleteMany({})
    await Order.deleteMany({ orderNumber: /^ORD-FULFILL-/ })
  })

  it('clears the user cart after successful paid fulfillment', async () => {
    const user = await User.create({
      fullname: 'Fulfillment Cart User',
      email: `fulfill-cart-${Date.now()}@test.com`,
      password: 'hashed',
    })

    const product = await Product.create({
      name: 'Fulfillment Cart Product',
      description: 'Test',
      brand: new mongoose.Types.ObjectId(),
      category: new mongoose.Types.ObjectId(),
      sizes: ['M'],
      colors: ['Blue'],
      user: user._id,
      images: ['https://example.com/img.jpg'],
      price: 100,
      totalQty: 10,
      totalSold: 0,
    })

    await Cart.create({
      user: user._id,
      items: [
        {
          _id: product._id,
          name: product.name,
          qty: 2,
          price: 100,
          totalPrice: 200,
          color: 'Blue',
          size: 'M',
          description: '',
          image: '',
        },
      ],
      couponCode: null,
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
      postPaymentProcessed: false,
    })

    const result = await processPaidOrder(order._id)

    expect(result.processed).toBe(true)

    const cart = await Cart.findOne({ user: user._id })
    expect(cart?.items || []).toHaveLength(0)
  })

  it('refunds and notifies the customer when post-payment stock reservation fails', async () => {
    const user = await User.create({
      fullname: 'Oversold Refund User',
      email: `oversold-refund-${Date.now()}@test.com`,
      password: 'hashed',
    })

    const product = await Product.create({
      name: 'Oversold Product',
      description: 'Test',
      brand: new mongoose.Types.ObjectId(),
      category: new mongoose.Types.ObjectId(),
      sizes: ['M'],
      colors: ['Blue'],
      user: user._id,
      images: ['https://example.com/img.jpg'],
      price: 150,
      totalQty: 1,
      totalSold: 1,
    })

    const order = await Order.create({
      user: user._id,
      orderItems: [
        testOrderItem({
          _id: product._id,
          name: product.name,
          qty: 1,
          price: 150,
          totalPrice: 150,
        }),
      ],
      shippingAddress: testShippingAddress(),
      totalPrice: 150,
      paymentStatus: 'paid',
      stripePaymentIntentId: 'pi_test_oversold',
      postPaymentProcessed: false,
    })

    const result = await processPaidOrder(order._id)

    expect(result.processed).toBe(false)
    expect(result.reason).toBe('insufficient_stock')
    expect(result.refundIssued).toBe(true)
    expect(result.refundAmount).toBe(150)
    expect(result.customerNotified).toBe(true)
    expect(createStripeRefund).toHaveBeenCalledTimes(1)
    expect(sendOrderStockUnavailableRefundEmail).toHaveBeenCalledTimes(1)

    const updated = await Order.findById(order._id)
    expect(updated.status).toBe('cancelled')
    expect(updated.refundStatus).toBe('full')
    expect(updated.totalRefunded).toBe(150)
    expect(updated.postPaymentProcessed).toBe(false)
    expect(updated.stripeRefundIds).toContain('re_test_refund')
  })
})
