import { describe, it, expect } from 'vitest'
import mongoose from 'mongoose'
import User from '../../model/User.js'
import Order from '../../model/Order.js'
import { userHasDeliveredPurchase } from '../../services/reviewPurchaseVerification.js'
import { testOrderItem, testShippingAddress } from '../helpers/orderFixtures.js'

describe('reviewPurchaseVerification', () => {
  it('returns true when user has a delivered order containing the product', async () => {
    const user = await User.create({
      fullname: 'Verified Buyer',
      email: `verified-buyer-${Date.now()}@test.com`,
      password: 'hashed',
    })
    const productId = new mongoose.Types.ObjectId()

    await Order.create({
      user: user._id,
      status: 'delivered',
      orderItems: [testOrderItem({ _id: productId })],
      shippingAddress: testShippingAddress(),
      totalPrice: 100,
    })

    expect(await userHasDeliveredPurchase(user._id, productId)).toBe(true)
  })

  it('returns false for shipped or cancelled orders', async () => {
    const user = await User.create({
      fullname: 'Pending Buyer',
      email: `pending-buyer-${Date.now()}@test.com`,
      password: 'hashed',
    })
    const productId = new mongoose.Types.ObjectId()

    await Order.create({
      user: user._id,
      status: 'shipped',
      orderItems: [testOrderItem({ _id: productId })],
      shippingAddress: testShippingAddress(),
      totalPrice: 100,
    })

    expect(await userHasDeliveredPurchase(user._id, productId)).toBe(false)
  })

  it('returns false when the product is not in any delivered order', async () => {
    const user = await User.create({
      fullname: 'Other Buyer',
      email: `other-buyer-${Date.now()}@test.com`,
      password: 'hashed',
    })
    const orderedProduct = new mongoose.Types.ObjectId()
    const otherProduct = new mongoose.Types.ObjectId()

    await Order.create({
      user: user._id,
      status: 'delivered',
      orderItems: [testOrderItem({ _id: orderedProduct })],
      shippingAddress: testShippingAddress(),
      totalPrice: 100,
    })

    expect(await userHasDeliveredPurchase(user._id, otherProduct)).toBe(false)
  })
})
