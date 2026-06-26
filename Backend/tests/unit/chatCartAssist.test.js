import { describe, it, expect } from 'vitest'
import {
  resolveColorForProduct,
  resolveSizeForProduct,
  isBallLikeProduct,
} from '../../services/cartVariantMatch.js'
import { resolveActiveCartQueue } from '../../services/cartQueue.js'

describe('cartVariantMatch', () => {
  it('maps closer to red to cherry', () => {
    const color = resolveColorForProduct(null, ['cherry', 'white', 'light pink'], 'closer to red')
    expect(color).toBe('cherry')
  })

  it('skips apparel size requirement for balls', () => {
    expect(isBallLikeProduct('Kookaburra leather ball')).toBe(true)
    const size = resolveSizeForProduct(
      null,
      { sizes: ['XXL', 'XL'], sizeMeasurementType: 'apparel', name: 'Kookaburra leather ball' },
      'Kookaburra leather ball',
      ''
    )
    expect(size).toBe('XXL')
  })

  it('uses One Size for no-size products', () => {
    const size = resolveSizeForProduct(
      null,
      { sizes: [], sizeMeasurementType: 'none', name: 'Gift card' },
      'Gift card',
      ''
    )
    expect(size).toBe('One Size')
  })
})

describe('cart queue', () => {
  it('resolves queue from session field', () => {
    const queue = resolveActiveCartQueue([], {
      remaining: [{ productId: '507f1f77bcf86cd799439014', name: 'ball', qty: 2 }],
    })
    expect(queue.remaining).toHaveLength(1)
  })
})
