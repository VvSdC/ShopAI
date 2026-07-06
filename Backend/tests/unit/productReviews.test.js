import { describe, it, expect } from 'vitest'
import mongoose from 'mongoose'
import User from '../../model/User.js'
import Product from '../../model/Product.js'
import Review from '../../model/Review.js'
import { loadPublicReviewsForProduct } from '../../services/productReviews.js'
import { createTestBrand } from '../helpers/testBrand.js'

describe('productReviews', () => {
  it('loads public reviews by Review.product without embedded product.reviews', async () => {
    const user = await User.create({
      fullname: 'Review Loader',
      email: `review-loader-${Date.now()}@test.com`,
      password: 'hashed',
    })
    const brand = await createTestBrand('review-loader-brand', user)
    const product = await Product.create({
      name: `Review Loader Product ${Date.now()}`,
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

    await Review.create({
      user: user._id,
      product: product._id,
      message: 'Visible review',
      rating: 5,
      moderationStatus: 'approved',
    })
    await Review.create({
      user: user._id,
      product: product._id,
      message: 'Hidden review',
      rating: 1,
      moderationStatus: 'rejected',
    })

    const reviews = await loadPublicReviewsForProduct(product._id)
    expect(reviews).toHaveLength(1)
    expect(reviews[0].message).toBe('Visible review')
  })
})
