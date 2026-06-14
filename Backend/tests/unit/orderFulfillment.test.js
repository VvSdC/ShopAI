import { describe, it, expect, beforeEach } from 'vitest'
import mongoose from 'mongoose'
import Order from '../../model/Order.js'
import User from '../../model/User.js'
import Product from '../../model/Product.js'
import Cart from '../../model/Cart.js'
import { processPaidOrder } from '../../services/orderFulfillment.js'
import { testOrderItem, testShippingAddress } from '../helpers/orderFixtures.js'

describe('processPaidOrder', () => {
  beforeEach(async () => {
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
      brand: 'TestBrand',
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
})
