import { describe, it, expect, beforeEach } from 'vitest'
import mongoose from 'mongoose'
import Product from '../../model/Product.js'
import User from '../../model/User.js'
import {
  atomicallyReserveStock,
  atomicallyReserveStockForOrderItems,
  StockReservationError,
} from '../../services/stockService.js'

async function createTestProduct(overrides = {}) {
  const user =
    overrides.user ||
    (await User.create({
      fullname: 'Stock Test User',
      email: `stock-${Date.now()}-${Math.random()}@test.com`,
      password: 'hashed',
    }))

  return Product.create({
    name: 'Test Product',
    description: 'Test description',
    brand: 'TestBrand',
    category: new mongoose.Types.ObjectId(),
    sizes: ['M'],
    colors: ['Blue'],
    user: user._id,
    images: ['https://example.com/img.jpg'],
    price: 100,
    totalQty: 2,
    totalSold: 0,
    ...overrides,
  })
}

describe('stockService', () => {
  beforeEach(async () => {
    await Product.deleteMany({ name: 'Test Product' })
  })

  it('atomically reserves stock when quantity is available', async () => {
    const product = await createTestProduct({ totalQty: 5 })
    const updated = await atomicallyReserveStock(product._id, 2)

    expect(updated).not.toBeNull()
    expect(updated.totalSold).toBe(2)

    const refreshed = await Product.findById(product._id)
    expect(refreshed.totalSold).toBe(2)
  })

  it('returns null when stock is insufficient', async () => {
    const product = await createTestProduct({ totalQty: 1, totalSold: 1 })
    const updated = await atomicallyReserveStock(product._id, 1)

    expect(updated).toBeNull()
    const refreshed = await Product.findById(product._id)
    expect(refreshed.totalSold).toBe(1)
  })

  it('prevents overselling under concurrent reservations', async () => {
    const product = await createTestProduct({ totalQty: 2, totalSold: 0 })
    const attempts = await Promise.all([
      atomicallyReserveStock(product._id, 1),
      atomicallyReserveStock(product._id, 1),
      atomicallyReserveStock(product._id, 1),
    ])

    const succeeded = attempts.filter(Boolean)
    expect(succeeded).toHaveLength(2)

    const refreshed = await Product.findById(product._id)
    expect(refreshed.totalSold).toBe(2)
  })

  it('releases previously reserved stock', async () => {
    const product = await createTestProduct({ totalQty: 23, totalSold: 2 })
    const { releaseStock } = await import('../../services/stockService.js')
    await releaseStock(product._id, 2)

    const refreshed = await Product.findById(product._id)
    expect(refreshed.totalSold).toBe(0)
  })

  it('rolls back partial reservations when a later line fails', async () => {
    const productA = await createTestProduct({ name: 'Test Product', totalQty: 3 })
    const productB = await createTestProduct({
      name: 'Test Product B',
      totalQty: 0,
      totalSold: 0,
    })

    await expect(
      atomicallyReserveStockForOrderItems([
        { _id: productA._id, qty: 2 },
        { _id: productB._id, qty: 1 },
      ])
    ).rejects.toBeInstanceOf(StockReservationError)

    const refreshedA = await Product.findById(productA._id)
    expect(refreshedA.totalSold).toBe(0)
  })
})
