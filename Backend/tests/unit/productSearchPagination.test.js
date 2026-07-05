import { describe, it, expect } from 'vitest'
import mongoose from 'mongoose'
import request from 'supertest'
import bcrypt from 'bcryptjs'
import app from '../../app/app.js'
import User from '../../model/User.js'
import Product from '../../model/Product.js'
import { createTestBrand } from '../helpers/testBrand.js'

async function createSearchProduct(name, suffix) {
  const user = await User.create({
    fullname: 'Search Pagination User',
    email: `search-page-${suffix}-${Date.now()}@test.com`,
    password: await bcrypt.hash('secret123', 10),
  })
  const brand = await createTestBrand(`search-pagination-${suffix}`, user)

  return Product.create({
    name,
    description: `${name} for pagination search tests`,
    brand: brand._id,
    category: new mongoose.Types.ObjectId(),
    sizes: ['M'],
    colors: ['Blue'],
    user: user._id,
    images: ['https://example.com/img.jpg'],
    price: 100,
    totalQty: 10,
    totalSold: 0,
    tags: ['pagination', 'search'],
  })
}

describe('GET /shopai/products search pagination', () => {
  it('returns page, limit, total, and hasMore for hybrid search', async () => {
    const stamp = Date.now()
    const names = [
      `Pagination Cricket Bat Alpha ${stamp}`,
      `Pagination Cricket Bat Beta ${stamp}`,
      `Pagination Cricket Bat Gamma ${stamp}`,
      `Pagination Cricket Bat Delta ${stamp}`,
    ]

    await Promise.all(names.map((name, index) => createSearchProduct(name, `${stamp}-${index}`)))

    const page1 = await request(app)
      .get('/shopai/products')
      .query({ q: `Pagination Cricket Bat ${stamp}`, page: 1, limit: 2 })

    expect(page1.status).toBe(200)
    expect(page1.body.products).toHaveLength(2)
    expect(page1.body.total).toBeGreaterThanOrEqual(4)
    expect(page1.body.pagination).toMatchObject({
      page: 1,
      limit: 2,
      total: page1.body.total,
      hasMore: true,
    })
    expect(page1.body.pagination.next).toEqual({ page: 2, limit: 2 })

    const page2 = await request(app)
      .get('/shopai/products')
      .query({ q: `Pagination Cricket Bat ${stamp}`, page: 2, limit: 2 })

    expect(page2.status).toBe(200)
    expect(page2.body.products.length).toBeGreaterThanOrEqual(1)
    expect(page2.body.pagination).toMatchObject({
      page: 2,
      limit: 2,
      total: page1.body.total,
      hasMore: page1.body.total > 4,
    })
    expect(page2.body.pagination.prev).toEqual({ page: 1, limit: 2 })

    const page1Ids = page1.body.products.map((p) => String(p._id))
    const page2Ids = page2.body.products.map((p) => String(p._id))
    expect(page1Ids.some((id) => page2Ids.includes(id))).toBe(false)
  })
})
