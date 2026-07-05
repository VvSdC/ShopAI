import { describe, it, expect } from 'vitest'
import bcrypt from 'bcryptjs'
import mongoose from 'mongoose'
import request from 'supertest'
import app from '../../app/app.js'
import User from '../../model/User.js'
import Product from '../../model/Product.js'
import Order from '../../model/Order.js'
import Review from '../../model/Review.js'
import { generateAccessToken } from '../../utils/generateToken.js'
import { createTestBrand } from '../helpers/testBrand.js'
import { testOrderItem, testShippingAddress } from '../helpers/orderFixtures.js'

describe('POST /shopai/reviews/:productID', () => {
  it('allows any verified-email user to review and marks delivered buyers', async () => {
    const user = await User.create({
      fullname: 'Reviewer With Order',
      email: `review-verified-${Date.now()}@test.com`,
      password: await bcrypt.hash('secret123', 10),
      isEmailVerified: true,
    })
    const guestReviewer = await User.create({
      fullname: 'Reviewer Without Order',
      email: `review-guest-${Date.now()}@test.com`,
      password: await bcrypt.hash('secret123', 10),
      isEmailVerified: true,
    })

    const brand = await createTestBrand('review-brand', user)
    const product = await Product.create({
      name: `Review Trust Product ${Date.now()}`,
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

    await Order.create({
      user: user._id,
      status: 'delivered',
      orderItems: [testOrderItem({ _id: product._id, name: product.name })],
      shippingAddress: testShippingAddress(),
      totalPrice: 100,
    })

    const buyerToken = generateAccessToken(user)
    const guestToken = generateAccessToken(guestReviewer)

    const buyerRes = await request(app)
      .post(`/shopai/reviews/${product._id}`)
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({ message: 'Great product from a real buyer', rating: 5 })

    expect(buyerRes.status).toBe(201)

    const guestRes = await request(app)
      .post(`/shopai/reviews/${product._id}`)
      .set('Authorization', `Bearer ${guestToken}`)
      .send({ message: 'Also fine without purchase', rating: 4 })

    expect(guestRes.status).toBe(201)

    const buyerReview = await Review.findOne({ user: user._id, product: product._id })
    const guestReview = await Review.findOne({
      user: guestReviewer._id,
      product: product._id,
    })

    expect(buyerReview.verifiedPurchase).toBe(true)
    expect(guestReview.verifiedPurchase).toBe(false)
  })
})
