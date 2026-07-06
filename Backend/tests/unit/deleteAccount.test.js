import { describe, it, expect } from 'vitest'
import mongoose from 'mongoose'
import request from 'supertest'
import app from '../../app/app.js'
import User from '../../model/User.js'
import Cart from '../../model/Cart.js'
import Wishlist from '../../model/Wishlist.js'
import Review from '../../model/Review.js'
import ReturnRequest from '../../model/ReturnRequest.js'
import Product from '../../model/Product.js'
import Order from '../../model/Order.js'
import { generateAccessToken } from '../../utils/generateToken.js'
import { testOrderItem, testShippingAddress } from '../helpers/orderFixtures.js'
import { createTestBrand } from '../helpers/testBrand.js'

describe('DELETE /shopai/users/delete-account', () => {
  it('cascades wishlist, reviews, return requests, and cart; anonymises orders', async () => {
    const user = await User.create({
      fullname: 'Delete Me',
      email: `delete-me-${Date.now()}@test.com`,
      password: 'hashed',
      isEmailVerified: true,
    })
    const otherUser = await User.create({
      fullname: 'Keep Me',
      email: `keep-me-${Date.now()}@test.com`,
      password: 'hashed',
      isEmailVerified: true,
    })

    const brand = await createTestBrand('delete-account-brand', user)

    const product = await Product.create({
      name: `Delete Account Product ${Date.now()}`,
      description: 'Test',
      brand: brand._id,
      category: new mongoose.Types.ObjectId(),
      sizes: ['M'],
      colors: ['Blue'],
      user: user._id,
      images: ['https://example.com/img.jpg'],
      price: 100,
      totalQty: 5,
    })

    const review = await Review.create({
      user: user._id,
      product: product._id,
      message: 'Great product',
      rating: 5,
      moderationStatus: 'approved',
    })
    const otherReview = await Review.create({
      user: otherUser._id,
      product: product._id,
      message: 'Also good',
      rating: 4,
      moderationStatus: 'approved',
    })

    await Cart.create({
      user: user._id,
      items: [
        {
          _id: product._id,
          name: product.name,
          price: product.price,
          qty: 1,
          totalPrice: product.price,
          color: 'Blue',
          size: 'M',
        },
      ],
    })

    await Wishlist.create({
      user: user._id,
      items: [
        {
          _id: product._id,
          name: product.name,
          price: product.price,
          image: '',
          brand: brand.name,
        },
      ],
    })

    const order = await Order.create({
      user: user._id,
      orderItems: [testOrderItem({ _id: product._id, name: product.name })],
      shippingAddress: testShippingAddress(),
      totalPrice: 100,
    })

    await ReturnRequest.create({
      user: user._id,
      order: order._id,
      orderNumber: order.orderNumber || `ORD-${Date.now()}`,
      items: [
        {
          lineId: 'line-1',
          productId: String(product._id),
          name: product.name,
          qty: 1,
          unitPrice: 100,
          reasonCode: 'changed_mind',
        },
      ],
      status: 'requested',
    })

    const accessToken = generateAccessToken(user)
    const res = await request(app)
      .delete('/shopai/users/delete-account')
      .set('Authorization', `Bearer ${accessToken}`)

    expect(res.status).toBe(200)

    expect(await User.findById(user._id)).toBeNull()
    expect(await Cart.findOne({ user: user._id })).toBeNull()
    expect(await Wishlist.findOne({ user: user._id })).toBeNull()
    expect(await Review.findById(review._id)).toBeNull()
    expect(await Review.findById(otherReview._id)).toBeTruthy()
    expect(await ReturnRequest.findOne({ user: user._id })).toBeNull()

    const reloadedOrder = await Order.findById(order._id)
    expect(reloadedOrder).toBeTruthy()
    expect(reloadedOrder.user).toBeUndefined()
  })
})
