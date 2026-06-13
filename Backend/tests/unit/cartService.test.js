import { describe, it, expect } from 'vitest'
import mongoose from 'mongoose'
import Cart from '../../model/Cart.js'
import User from '../../model/User.js'
import Product from '../../model/Product.js'
import { getCart } from '../../services/cartService.js'

describe('cartService findOrCreateCart', () => {
  it('returns one cart per user when create races on the unique user index', async () => {
    const user = await User.create({
      fullname: 'Cart Race User',
      email: `cart-race-${Date.now()}@test.com`,
      password: 'hashed',
    })

    const [first, second] = await Promise.all([getCart(user._id), getCart(user._id)])

    expect(first.isEmpty).toBe(true)
    expect(second.isEmpty).toBe(true)

    const carts = await Cart.find({ user: user._id })
    expect(carts).toHaveLength(1)
  })

  it('enforces unique user at the database level', async () => {
    const user = await User.create({
      fullname: 'Cart Unique User',
      email: `cart-unique-${Date.now()}@test.com`,
      password: 'hashed',
    })

    await Cart.create({ user: user._id, items: [], couponCode: null })

    await expect(
      Cart.create({ user: user._id, items: [], couponCode: null })
    ).rejects.toMatchObject({ code: 11000 })
  })

  it('refreshes stale cart prices from the live catalog on getCart', async () => {
    const user = await User.create({
      fullname: 'Price Refresh User',
      email: `cart-price-${Date.now()}@test.com`,
      password: 'hashed',
    })

    const product = await Product.create({
      name: `Price Refresh Product ${Date.now()}`,
      description: 'Test',
      brand: 'TestBrand',
      category: new mongoose.Types.ObjectId(),
      sizes: ['M'],
      colors: ['Blue'],
      images: ['https://example.com/img.jpg'],
      price: 100,
      totalQty: 5,
    })

    await Cart.create({
      user: user._id,
      items: [
        {
          _id: product._id,
          name: product.name,
          qty: 2,
          price: 100,
          totalPrice: 200,
          color: 'Blue',
          size: 'M',
          description: product.description,
          image: product.images[0],
        },
      ],
      couponCode: null,
    })

    product.price = 120
    await product.save()

    const cart = await getCart(user._id)

    expect(cart.items[0].price).toBe(120)
    expect(cart.items[0].totalPrice).toBe(240)
    expect(cart.priceWarnings).toHaveLength(1)
    expect(cart.priceWarnings[0].previousPrice).toBe(100)
    expect(cart.priceWarnings[0].currentPrice).toBe(120)

    const stored = await Cart.findOne({ user: user._id })
    expect(stored.items[0].price).toBe(120)
    expect(stored.items[0].totalPrice).toBe(240)
  })
})
