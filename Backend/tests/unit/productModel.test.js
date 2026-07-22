import { describe, it, expect } from 'vitest'
import mongoose from 'mongoose'
import Product from '../../model/Product.js'
import User from '../../model/User.js'
import { createTestBrand } from '../helpers/testBrand.js'

async function createTestProduct(overrides = {}) {
  const user =
    overrides.user ||
    (await User.create({
      fullname: 'Product Model User',
      email: `product-model-${Date.now()}-${Math.random()}@test.com`,
      password: 'hashed',
    }))

  const brand =
    overrides.brand ||
    (await createTestBrand(`test-brand-${Date.now()}`, user))._id

  return Product.create({
    name: `Product ${Date.now()}-${Math.random()}`,
    description: 'Test description',
    brand,
    category: new mongoose.Types.ObjectId(),
    sizes: ['M'],
    colors: ['Blue'],
    user: user._id,
    images: ['https://example.com/img.jpg'],
    price: 100,
    totalQty: 2,
    ...overrides,
  })
}

describe('Product model', () => {
  it('rejects duplicate product names that differ only by case', async () => {
    const name = `Nike Air Max ${Date.now()}`
    const user = await User.create({
      fullname: 'Case Dup User',
      email: `case-dup-${Date.now()}@test.com`,
      password: 'hashed',
    })

    await createTestProduct({ name, user: user._id })

    await expect(
      createTestProduct({ name: name.toLowerCase(), user: user._id })
    ).rejects.toThrow()
  })

  it('enforces unique product names at the database level', async () => {
    const name = `Unique Name ${Date.now()}`
    const user = await User.create({
      fullname: 'Dup Product User',
      email: `dup-product-${Date.now()}@test.com`,
      password: 'hashed',
    })

    await createTestProduct({ name, user: user._id })

    await expect(
      createTestProduct({ name, user: user._id })
    ).rejects.toMatchObject({ code: 11000 })
  })

  it('allows products without a user (legacy / import rows)', async () => {
    const product = await createTestProduct({ user: undefined })
    expect(product.user).toBeUndefined()
  })

  it('omits user from public JSON output', async () => {
    const user = await User.create({
      fullname: 'Audit User',
      email: `audit-${Date.now()}@test.com`,
      password: 'hashed',
    })
    const product = await createTestProduct({ user: user._id })
    const json = product.toJSON()
    expect(json.user).toBeUndefined()
  })
})
