import { describe, it, expect, vi } from 'vitest'
import mongoose from 'mongoose'
import Cart from '../../model/Cart.js'
import User from '../../model/User.js'
import Product from '../../model/Product.js'
import { getCart, syncLocalItems, addItem } from '../../services/cartService.js'

import { createTestBrand } from '../helpers/testBrand.js'

async function createCartTestProduct(user, overrides = {}) {
  const brand = await createTestBrand(`cart-test-${Date.now()}-${Math.random()}`, user)
  return Product.create({
    description: 'Test',
    brand: brand._id,
    category: new mongoose.Types.ObjectId(),
    sizes: ['M'],
    colors: ['Blue'],
    images: ['https://example.com/img.jpg'],
    price: 100,
    totalQty: 5,
    user: user._id,
    ...overrides,
  })
}

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

    const product = await createCartTestProduct(user, {
      name: `Price Refresh Product ${Date.now()}`,
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

describe('syncLocalItems', () => {
  it('batch-loads products and merges missing guest lines into the server cart', async () => {
    const user = await User.create({
      fullname: 'Sync Local User',
      email: `cart-sync-${Date.now()}@test.com`,
      password: 'hashed',
    })

    const productA = await createCartTestProduct(user, {
      name: `Sync Product A ${Date.now()}`,
      sizes: ['M'],
      colors: ['Blue'],
      images: ['https://example.com/a.jpg'],
      price: 50,
      totalQty: 10,
    })

    const productB = await createCartTestProduct(user, {
      name: `Sync Product B ${Date.now()}`,
      sizes: ['L'],
      colors: ['Red'],
      images: ['https://example.com/b.jpg'],
      price: 75,
      totalQty: 8,
    })

    const findByIdSpy = vi.spyOn(Product, 'findById')
    const findSpy = vi.spyOn(Product, 'find')

    const cart = await syncLocalItems(user._id, [
      {
        _id: productA._id,
        color: 'Blue',
        size: 'M',
        qty: 2,
      },
      {
        _id: productB._id,
        color: 'Red',
        size: 'L',
        qty: 1,
      },
      {
        _id: productA._id,
        color: 'Blue',
        size: 'M',
        qty: 3,
      },
    ])

    expect(findByIdSpy).not.toHaveBeenCalled()
    const batchCall = findSpy.mock.calls.find(
      ([filter]) => Array.isArray(filter?._id?.$in) && filter._id.$in.length === 2
    )
    expect(batchCall).toBeDefined()
    expect(cart.items).toHaveLength(2)
    expect(cart.total).toBe(175)

    findByIdSpy.mockRestore()
    findSpy.mockRestore()
  })
})

describe('cart coupon metadata', () => {
  it('includes expiry info when a live coupon is applied', async () => {
    const Coupon = (await import('../../model/Coupon.js')).default
    const admin = await User.create({
      fullname: 'Coupon Cart User',
      email: `coupon-cart-${Date.now()}@test.com`,
      password: 'hashed',
    })
    const shopper = await User.create({
      fullname: 'Shopper',
      email: `shopper-coupon-${Date.now()}@test.com`,
      password: 'hashed',
    })

    const endDate = new Date()
    endDate.setDate(endDate.getDate() + 3)

    await Coupon.create({
      code: `SAVE${Date.now()}`.slice(0, 10),
      discount: 10,
      startDate: new Date(),
      endDate,
      user: admin._id,
    })

    const couponCode = (await Coupon.findOne({ user: admin._id })).code

    await Cart.create({
      user: shopper._id,
      items: [],
      couponCode,
    })

    const cart = await getCart(shopper._id)

    expect(cart.couponCode).toBe(couponCode)
    expect(cart.couponDiscount).toBe(10)
    expect(cart.couponValidUntil).toBeTruthy()
    expect(cart.couponDaysLeft).toMatch(/day/)
  })
})

describe('addItem', () => {
  it('accepts no-size products using the One Size placeholder', async () => {
    const user = await User.create({
      fullname: 'No Size User',
      email: `no-size-cart-${Date.now()}@test.com`,
      password: 'hashed',
    })

    const product = await createCartTestProduct(user, {
      name: `No Size Product ${Date.now()}`,
      sizeMeasurementType: 'none',
      sizeLabel: '',
      sizes: [],
      colors: ['Black'],
      price: 299,
    })

    const cart = await addItem(user._id, {
      productId: product._id,
      color: 'Black',
      size: 'One Size',
      qty: 1,
    })

    expect(cart.items).toHaveLength(1)
    expect(cart.items[0].size).toBe('One Size')
    expect(cart.items[0].color).toBe('Black')
    expect(cart.total).toBe(299)
  })
})
