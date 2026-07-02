import { describe, it, expect } from 'vitest'
import { formatWishlistPayload } from '../../services/wishlistService.js'

describe('wishlistService', () => {
  it('formats wishlist payload', () => {
    const payload = formatWishlistPayload([
      { _id: 'abc', name: 'Bat', price: 100, image: '', brand: 'SG', qtyLeft: 5, inStock: true },
    ])
    expect(payload.count).toBe(1)
    expect(payload.isEmpty).toBe(false)
    expect(payload.items[0].name).toBe('Bat')
  })
})
