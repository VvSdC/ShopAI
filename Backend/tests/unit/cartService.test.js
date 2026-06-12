import { describe, it, expect } from 'vitest'
import Cart from '../../model/Cart.js'
import User from '../../model/User.js'
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
})
