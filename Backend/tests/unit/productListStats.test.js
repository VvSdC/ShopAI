import { describe, it, expect } from 'vitest'
import mongoose from 'mongoose'
import User from '../../model/User.js'
import Product from '../../model/Product.js'
import Review from '../../model/Review.js'
import {
  mapProductForList,
  mapProductsForList,
  reviewStatsByProductIds,
} from '../../services/productListStats.js'
import { createTestBrand } from '../helpers/testBrand.js'

async function createProduct(name) {
  const user = await User.create({
    fullname: 'List Stats User',
    email: `list-stats-${Date.now()}-${Math.random()}@test.com`,
    password: 'hashed',
  })
  const brand = await createTestBrand(`list-stats-brand-${Date.now()}`, user)
  return Product.create({
    name,
    description: 'Test',
    brand: brand._id,
    category: new mongoose.Types.ObjectId(),
    sizes: ['M'],
    colors: ['Blue'],
    user: user._id,
    images: ['https://example.com/img.jpg'],
    price: 100,
    totalQty: 10,
    totalSold: 2,
  })
}

describe('productListStats', () => {
  it('mapProductForList exposes qtyLeft and omits reviews/embeddings', () => {
    const mapped = mapProductForList(
      {
        _id: new mongoose.Types.ObjectId(),
        name: 'Bat',
        totalQty: 10,
        totalSold: 3,
        category: { _id: new mongoose.Types.ObjectId(), name: 'Sports' },
        reviews: [new mongoose.Types.ObjectId()],
        embedding: [0.1, 0.2],
        user: new mongoose.Types.ObjectId(),
      },
      { totalReviews: 4, averageRating: 4.5 }
    )

    expect(mapped.qtyLeft).toBe(7)
    expect(mapped.category).toBe('Sports')
    expect(mapped.totalReviews).toBe(4)
    expect(mapped.averageRating).toBe(4.5)
    expect(mapped.reviews).toBeUndefined()
    expect(mapped.embedding).toBeUndefined()
    expect(mapped.user).toBeUndefined()
  })

  it('aggregates approved review count and average in one query', async () => {
    const product = await createProduct(`Stats Product ${Date.now()}`)
    const other = await createProduct(`Other Product ${Date.now()}`)

    await Review.create([
      {
        user: new mongoose.Types.ObjectId(),
        product: product._id,
        message: 'Great',
        rating: 5,
        moderationStatus: 'approved',
      },
      {
        user: new mongoose.Types.ObjectId(),
        product: product._id,
        message: 'Ok',
        rating: 3,
        moderationStatus: 'approved',
      },
      {
        user: new mongoose.Types.ObjectId(),
        product: product._id,
        message: 'Spam',
        rating: 1,
        moderationStatus: 'rejected',
      },
      {
        user: new mongoose.Types.ObjectId(),
        product: other._id,
        message: 'Nice',
        rating: 4,
        moderationStatus: 'approved',
      },
    ])

    const stats = await reviewStatsByProductIds([product._id, other._id])
    expect(stats.get(String(product._id))).toEqual({
      totalReviews: 2,
      averageRating: 4,
    })
    expect(stats.get(String(other._id))).toEqual({
      totalReviews: 1,
      averageRating: 4,
    })
  })

  it('mapProductsForList attaches stats without review documents', async () => {
    const product = await createProduct(`List Map Product ${Date.now()}`)
    await Review.create({
      user: new mongoose.Types.ObjectId(),
      product: product._id,
      message: 'Solid',
      rating: 5,
      moderationStatus: 'approved',
    })

    const lean = await Product.findById(product._id).lean()

    const [mapped] = await mapProductsForList([lean])
    expect(mapped.totalReviews).toBe(1)
    expect(mapped.averageRating).toBe(5)
    expect(mapped.qtyLeft).toBe(8)
    expect(mapped.reviews).toBeUndefined()
    expect(mapped.embedding).toBeUndefined()
  })
})
