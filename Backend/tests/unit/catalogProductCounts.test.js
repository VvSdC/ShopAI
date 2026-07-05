import { describe, it, expect } from 'vitest'
import mongoose from 'mongoose'
import Category from '../../model/Category.js'
import User from '../../model/User.js'
import Product from '../../model/Product.js'
import {
  countProductsByBrandId,
  countProductsByCategoryId,
  attachProductCountsToCategories,
} from '../../services/catalogProductCounts.js'
import { createTestBrand } from '../helpers/testBrand.js'

describe('catalogProductCounts', () => {
  it('counts products by category and brand from Product collection', async () => {
    const user = await User.create({
      fullname: 'Count User',
      email: `count-${Date.now()}@test.com`,
      password: 'hashed',
    })

    const category = await Category.create({
      name: `count-cat-${Date.now()}`,
      user: user._id,
      image: 'https://example.com/cat.jpg',
    })

    const nike = await createTestBrand('nike', user)
    const adidas = await createTestBrand('adidas', user)

    await Product.create({
      name: `Count Product A ${Date.now()}`,
      description: 'Test',
      brand: nike._id,
      category: category._id,
      sizes: ['M'],
      colors: ['Blue'],
      user: user._id,
      images: ['https://example.com/a.jpg'],
      price: 100,
      totalQty: 2,
    })

    await Product.create({
      name: `Count Product B ${Date.now()}`,
      description: 'Test',
      brand: nike._id,
      category: category._id,
      sizes: ['L'],
      colors: ['Red'],
      user: user._id,
      images: ['https://example.com/b.jpg'],
      price: 200,
      totalQty: 1,
    })

    await Product.create({
      name: `Count Product C ${Date.now()}`,
      description: 'Test',
      brand: adidas._id,
      category: new mongoose.Types.ObjectId(),
      sizes: ['S'],
      colors: ['Green'],
      user: user._id,
      images: ['https://example.com/c.jpg'],
      price: 50,
      totalQty: 1,
    })

    const byCategory = await countProductsByCategoryId()
    const byBrand = await countProductsByBrandId()

    expect(byCategory.get(String(category._id))).toBe(2)
    expect(byBrand.get(String(nike._id))).toBe(2)
    expect(byBrand.get(String(adidas._id))).toBe(1)
  })

  it('attaches productCount to categories from Product.category refs', async () => {
    const user = await User.create({
      fullname: 'Attach Count User',
      email: `attach-count-${Date.now()}@test.com`,
      password: 'hashed',
    })

    const category = await Category.create({
      name: `attach-cat-${Date.now()}`,
      user: user._id,
      image: 'https://example.com/cat.jpg',
    })

    const nike = await createTestBrand('nike', user)

    await Product.create({
      name: `Attach Count Product ${Date.now()}`,
      description: 'Test',
      brand: nike._id,
      category: category._id,
      sizes: ['M'],
      colors: ['Blue'],
      user: user._id,
      images: ['https://example.com/a.jpg'],
      price: 100,
      totalQty: 2,
    })

    const [withCount] = await attachProductCountsToCategories([
      { _id: category._id, name: category.name },
    ])

    expect(withCount.productCount).toBe(1)
  })
})
