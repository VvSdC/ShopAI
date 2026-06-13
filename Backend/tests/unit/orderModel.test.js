import { describe, it, expect } from 'vitest'
import mongoose from 'mongoose'
import Order from '../../model/Order.js'
import User from '../../model/User.js'
import { testOrderItem, testShippingAddress } from '../helpers/orderFixtures.js'

describe('Order model schemas', () => {
  it('persists orderItems with line-item fields', async () => {
    const user = await User.create({
      fullname: 'Schema User',
      email: `order-schema-${Date.now()}@test.com`,
      password: 'hashed',
    })

    const productId = new mongoose.Types.ObjectId()
    const order = await Order.create({
      user: user._id,
      orderItems: [
        testOrderItem({
          _id: productId,
          name: 'Shirt',
          lineId: 'line-abc',
          lineStatus: 'active',
          cancelledQty: 0,
          returnedQty: 0,
        }),
      ],
      shippingAddress: testShippingAddress(),
      totalPrice: 100,
    })

    const reloaded = await Order.findById(order._id)
    const item = reloaded.orderItems[0]
    expect(item._id.toString()).toBe(productId.toString())
    expect(item.name).toBe('Shirt')
    expect(item.lineId).toBe('line-abc')
    expect(item.lineStatus).toBe('active')
    expect(item.color).toBe('Black')
    expect(item.size).toBe('M')
  })

  it('rejects orderItems missing required product fields', async () => {
    const user = await User.create({
      fullname: 'Invalid Item User',
      email: `order-invalid-item-${Date.now()}@test.com`,
      password: 'hashed',
    })

    await expect(
      Order.create({
        user: user._id,
        orderItems: [{ name: 'No product ref', price: 10, qty: 1 }],
        shippingAddress: testShippingAddress(),
        totalPrice: 10,
      })
    ).rejects.toThrow(/validation failed/i)
  })

  it('rejects shippingAddress missing required fields', async () => {
    const user = await User.create({
      fullname: 'Invalid Address User',
      email: `order-invalid-addr-${Date.now()}@test.com`,
      password: 'hashed',
    })

    await expect(
      Order.create({
        user: user._id,
        orderItems: [testOrderItem()],
        shippingAddress: { address: '1 Test St', city: 'Test', country: 'IN' },
        totalPrice: 100,
      })
    ).rejects.toThrow(/validation failed/i)
  })

  it('declares createdAt index for admin order listing', () => {
    const indexes = Order.schema.indexes()
    expect(indexes.some(([spec]) => spec.createdAt === -1)).toBe(true)
  })
})
