import { describe, it, expect, beforeEach } from 'vitest'
import mongoose from 'mongoose'
import User from '../../model/User.js'
import Product from '../../model/Product.js'
import {
  runWithCartIdempotency,
  resetCartIdempotencyForTests,
} from '../../services/cartIdempotency.js'
import { addItem, updateItemQty, removeItem } from '../../services/cartService.js'

describe('cartIdempotency', () => {
  beforeEach(() => {
    resetCartIdempotencyForTests()
  })

  it('replays the stored response for the same user and key', async () => {
    const user = await User.create({
      fullname: 'Idempotency User',
      email: `cart-idem-${Date.now()}@test.com`,
      password: 'hashed',
    })

    let runs = 0
    const first = await runWithCartIdempotency({
      userId: user._id,
      idempotencyKey: 'add-once-key',
      run: async () => {
        runs += 1
        return { status: 'success', value: 1 }
      },
    })
    const second = await runWithCartIdempotency({
      userId: user._id,
      idempotencyKey: 'add-once-key',
      run: async () => {
        runs += 1
        return { status: 'success', value: 2 }
      },
    })

    expect(first).toEqual({ status: 'success', value: 1 })
    expect(second).toEqual(first)
    expect(runs).toBe(1)
  })

  it('scopes idempotency keys per user', async () => {
    const userA = await User.create({
      fullname: 'User A',
      email: `cart-idem-a-${Date.now()}@test.com`,
      password: 'hashed',
    })
    const userB = await User.create({
      fullname: 'User B',
      email: `cart-idem-b-${Date.now()}@test.com`,
      password: 'hashed',
    })

    let runs = 0
    await runWithCartIdempotency({
      userId: userA._id,
      idempotencyKey: 'shared-key',
      run: async () => {
        runs += 1
        return { user: 'A' }
      },
    })
    await runWithCartIdempotency({
      userId: userB._id,
      idempotencyKey: 'shared-key',
      run: async () => {
        runs += 1
        return { user: 'B' }
      },
    })

    expect(runs).toBe(2)
  })

  it('allows retry after a failed mutation', async () => {
    const user = await User.create({
      fullname: 'Retry User',
      email: `cart-idem-retry-${Date.now()}@test.com`,
      password: 'hashed',
    })

    let runs = 0
    await expect(
      runWithCartIdempotency({
        userId: user._id,
        idempotencyKey: 'retry-key',
        run: async () => {
          runs += 1
          throw new Error('transient failure')
        },
      })
    ).rejects.toThrow('transient failure')

    const ok = await runWithCartIdempotency({
      userId: user._id,
      idempotencyKey: 'retry-key',
      run: async () => {
        runs += 1
        return { status: 'success' }
      },
    })

    expect(ok).toEqual({ status: 'success' })
    expect(runs).toBe(2)
  })
})

describe('cartService mutation idempotency characteristics', () => {
  let user
  let product

  beforeEach(async () => {
    user = await User.create({
      fullname: 'Cart Mutation User',
      email: `cart-mutation-${Date.now()}@test.com`,
      password: 'hashed',
    })

    product = await Product.create({
      name: `Cart Mutation Product ${Date.now()}`,
      description: 'Test',
      brand: new mongoose.Types.ObjectId(),
      category: new mongoose.Types.ObjectId(),
      sizes: ['M'],
      colors: ['Blue'],
      images: ['https://example.com/img.jpg'],
      price: 100,
      totalQty: 10,
    })
  })

  it('addItem merges duplicate lines by incrementing qty (not retry-safe without a key)', async () => {
    await addItem(user._id, {
      productId: product._id,
      color: 'Blue',
      size: 'M',
      qty: 1,
    })
    const cart = await addItem(user._id, {
      productId: product._id,
      color: 'Blue',
      size: 'M',
      qty: 1,
    })

    expect(cart.items).toHaveLength(1)
    expect(cart.items[0].qty).toBe(2)
  })

  it('addItem with the same Idempotency-Key only increments qty once', async () => {
    const payload = {
      productId: product._id,
      color: 'Blue',
      size: 'M',
      qty: 1,
    }

    await runWithCartIdempotency({
      userId: user._id,
      idempotencyKey: 'add-line-key',
      run: () => addItem(user._id, payload),
    })
    const cart = await runWithCartIdempotency({
      userId: user._id,
      idempotencyKey: 'add-line-key',
      run: () => addItem(user._id, payload),
    })

    expect(cart.items).toHaveLength(1)
    expect(cart.items[0].qty).toBe(1)
  })

  it('updateItemQty is naturally idempotent for identical retries', async () => {
    await addItem(user._id, {
      productId: product._id,
      color: 'Blue',
      size: 'M',
      qty: 1,
    })

    await updateItemQty(user._id, {
      productId: product._id,
      color: 'Blue',
      size: 'M',
      qty: 3,
    })
    const cart = await updateItemQty(user._id, {
      productId: product._id,
      color: 'Blue',
      size: 'M',
      qty: 3,
    })

    expect(cart.items[0].qty).toBe(3)
  })

  it('removeItem is naturally idempotent for identical retries', async () => {
    await addItem(user._id, {
      productId: product._id,
      color: 'Blue',
      size: 'M',
      qty: 1,
    })

    const line = {
      productId: product._id,
      color: 'Blue',
      size: 'M',
    }

    await removeItem(user._id, line)
    const cart = await removeItem(user._id, line)

    expect(cart.items).toHaveLength(0)
    expect(cart.isEmpty).toBe(true)
  })
})
