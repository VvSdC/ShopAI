import { describe, it, expect } from 'vitest'
import bcrypt from 'bcryptjs'
import request from 'supertest'
import app from '../../app/app.js'
import User from '../../model/User.js'
import Order from '../../model/Order.js'
import { generateAccessToken } from '../../utils/generateToken.js'
import { testOrderItem, testShippingAddress } from '../helpers/orderFixtures.js'

describe('GET /shopai/users/profile', () => {
  it('does not include orders — list comes from Order collection via /orders/my-orders', async () => {
    const user = await User.create({
      fullname: 'Profile Orders User',
      email: `profile-orders-${Date.now()}@test.com`,
      password: await bcrypt.hash('secret123', 10),
      isEmailVerified: true,
    })

    const order = await Order.create({
      user: user._id,
      orderItems: [testOrderItem()],
      shippingAddress: testShippingAddress(),
      totalPrice: 500,
    })

    const accessToken = generateAccessToken(user)

    const res = await request(app)
      .get('/shopai/users/profile')
      .set('Authorization', `Bearer ${accessToken}`)

    expect(res.status).toBe(200)
    expect(res.body.user.email).toBe(user.email)
    expect(res.body.user.orders).toBeUndefined()
    expect(JSON.stringify(res.body)).not.toContain(String(order._id))
  })
})
