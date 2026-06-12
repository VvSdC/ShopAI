import { describe, it, expect } from 'vitest'
import request from 'supertest'
import app from '../../app/app.js'
import Order from '../../model/Order.js'
import User from '../../model/User.js'
import { generateAccessToken } from '../../utils/generateToken.js'
import { testOrderItem, testShippingAddress } from '../helpers/orderFixtures.js'

describe('PUT /shopai/orders/update/:id', () => {
  it('rejects status updates for cancelled orders', async () => {
    const admin = await User.create({
      fullname: 'Admin User',
      email: `admin-${Date.now()}@test.com`,
      password: 'hashed',
      isAdmin: true,
    })

    const order = await Order.create({
      user: admin._id,
      orderItems: [testOrderItem({ name: 'Test', price: 100 })],
      shippingAddress: testShippingAddress(),
      totalPrice: 100,
      paymentStatus: 'paid',
      status: 'cancelled',
      refundStatus: 'full',
      totalRefunded: 100,
    })

    const token = generateAccessToken(admin)

    const res = await request(app)
      .put(`/shopai/orders/update/${order._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'processing' })

    expect(res.status).toBe(400)
    expect(res.body.message).toMatch(/cancelled/i)

    const unchanged = await Order.findById(order._id)
    expect(unchanged.status).toBe('cancelled')
  })
})
