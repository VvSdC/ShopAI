import { describe, it, expect, beforeEach } from 'vitest'
import Category from '../../model/Category.js'
import User from '../../model/User.js'
import Product from '../../model/Product.js'
import { categoryDisplayName, resolveCategoryId } from '../../utils/categoryRef.js'
import { createTestBrand } from '../helpers/testBrand.js'

describe('categoryRef', () => {
  let category
  let user

  beforeEach(async () => {
    user = await User.create({
      fullname: 'Category Ref User',
      email: `cat-ref-${Date.now()}-${Math.random()}@test.com`,
      password: 'hashed',
    })

    category = await Category.create({
      name: `Shirts-${Date.now()}`,
      user: user._id,
      image: 'https://example.com/cat.jpg',
    })
  })

  it('resolves category id from exact name', async () => {
    const id = await resolveCategoryId(category.name)
    expect(String(id)).toBe(String(category._id))
  })

  it('resolves category id from ObjectId string', async () => {
    const id = await resolveCategoryId(String(category._id))
    expect(String(id)).toBe(String(category._id))
  })

  it('returns null for unknown category', async () => {
    const id = await resolveCategoryId('nonexistent-category-name')
    expect(id).toBeNull()
  })

  it('does not treat arbitrary words as ObjectIds', async () => {
    const id = await resolveCategoryId('sports')
    expect(id).toBeNull()
  })

  it('categoryDisplayName reads populated category documents', () => {
    expect(categoryDisplayName({ name: category.name })).toBe(category.name)
    expect(categoryDisplayName(category.name)).toBe(category.name)
    expect(categoryDisplayName(null)).toBe('')
  })

  it('populates category on Product queries', async () => {
    const testBrand = await createTestBrand('testbrand', user)
    const product = await Product.create({
      name: `Category Populate ${Date.now()}`,
      description: 'Test',
      brand: testBrand._id,
      category: category._id,
      sizes: ['M'],
      colors: ['Blue'],
      user: user._id,
      images: ['https://example.com/img.jpg'],
      price: 100,
      totalQty: 5,
    })

    const loaded = await Product.findById(product._id).populate('category', 'name')
    expect(loaded.category).toBeTruthy()
    expect(loaded.category.name).toBe(category.name)
    expect(loaded.toJSON().category).toBe(category.name)
  })
})
