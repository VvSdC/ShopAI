import { describe, it, expect } from 'vitest'
import {
  resolveProductIdFromContext,
  extractProductsFromHistory,
} from '../../services/chatGraph/productContext.js'
import { buildProductDetailReply } from '../../services/chatPostProcess.js'

describe('productContext', () => {
  const history = [
    {
      role: 'assistant',
      content:
        'I found 1 product:\n\n1. **Jack & Jones Men’s Red Casual Shirt** — ₹1,899 · [View product](/products/507f1f77bcf86cd799439011)',
    },
  ]

  it('extracts product ids from assistant listings', () => {
    const items = extractProductsFromHistory(history)
    expect(items).toHaveLength(1)
    expect(items[0].id).toBe('507f1f77bcf86cd799439011')
    expect(items[0].name).toContain('Jack & Jones')
  })

  it('resolves mens shirt detail requests', () => {
    expect(
      resolveProductIdFromContext(history, 'can you give details about the mens shirt')
    ).toBe('507f1f77bcf86cd799439011')
  })

  it('resolves pronoun follow-ups to the last product', () => {
    expect(resolveProductIdFromContext(history, 'i want more details about it')).toBe(
      '507f1f77bcf86cd799439011'
    )
  })
})

describe('buildProductDetailReply', () => {
  it('includes sizes and colors', () => {
    const reply = buildProductDetailReply({
      id: '507f1f77bcf86cd799439011',
      name: 'Jack & Jones Men’s Red Casual Shirt',
      description: 'Comfortable cotton casual shirt.',
      brand: 'Jack & Jones',
      category: 'Shirts',
      price: 1899,
      qtyLeft: 32,
      sizes: ['S', 'M', 'L'],
      colors: ['Red', 'Navy'],
      productUrl: '/products/507f1f77bcf86cd799439011',
    })

    expect(reply).toContain('Available sizes')
    expect(reply).toContain('S, M, L')
    expect(reply).toContain('Available colors')
    expect(reply).toContain('Red, Navy')
    expect(reply).toContain('size**, **color**, and **quantity**')
  })
})
