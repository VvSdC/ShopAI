import { describe, it, expect } from 'vitest'
import { buildChatBlocks } from '../../services/chatBlocks.js'

describe('buildChatBlocks suggested prompts', () => {
  it('adds suggested prompts when search returned empty', () => {
    const blocks = buildChatBlocks({
      toolResults: [{ toolName: 'search_products', count: 0, products: [] }],
      messageKind: 'product_listing',
    })
    expect(blocks.some((b) => b.type === 'suggested_prompts')).toBe(true)
  })

  it('adds product listing from disambiguation tool result', () => {
    const blocks = buildChatBlocks({
      toolResults: [
        {
          toolName: 'product_disambiguation',
          products: [
            {
              id: '507f1f77bcf86cd799439011',
              name: 'Bat A',
              price: 1000,
              productUrl: '/products/507f1f77bcf86cd799439011',
            },
            {
              id: '507f1f77bcf86cd799439012',
              name: 'Bat B',
              price: 1200,
              productUrl: '/products/507f1f77bcf86cd799439012',
            },
          ],
        },
      ],
      messageKind: 'product_listing',
    })
    expect(blocks.some((b) => b.type === 'product_listing')).toBe(true)
  })
})
