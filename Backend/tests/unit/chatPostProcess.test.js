import { describe, it, expect } from 'vitest'
import {
  findLastProductDetails,
  formatAgentReply,
  buildProductDetailReply,
  ensureSearchCatalogReply,
  replyHasCatalogProductLinks,
} from '../../services/chatPostProcess.js'

describe('findLastProductDetails', () => {
  it('skips get_cart tool messages and finds earlier product details', () => {
    const messages = [
      { role: 'tool', content: JSON.stringify({ id: '507f1f77bcf86cd799439011', name: 'Cricket Bat', colors: ['Red'], sizes: ['M'] }) },
      { role: 'tool', content: JSON.stringify({ message: 'Your cart is empty.', cart: { isEmpty: true, items: [] } }) },
    ]

    const product = findLastProductDetails(messages)
    expect(product?.name).toBe('Cricket Bat')
  })

  it('returns null when only non-product tool payloads exist', () => {
    const messages = [
      { role: 'tool', content: JSON.stringify({ message: 'Your cart is empty.', cart: { items: [] } }) },
    ]
    expect(findLastProductDetails(messages)).toBeNull()
  })
})

describe('formatAgentReply', () => {
  it('uses product details after get_cart when add_to_cart did not succeed', () => {
    const messages = [
      {
        role: 'tool',
        content: JSON.stringify({
          id: '507f1f77bcf86cd799439011',
          name: 'Training Ball',
          description: 'Leather ball',
          colors: ['White'],
          sizes: ['Standard'],
          sizeMeasurementType: 'custom',
          price: 499,
        }),
      },
      {
        role: 'tool',
        content: JSON.stringify({ message: 'Your cart is empty.', cart: { items: [] } }),
      },
    ]
    const toolResults = [
      { toolName: 'get_cart', cart: { items: [] } },
    ]

    const reply = formatAgentReply(
      'Your cart is empty. Tell me what you would like to add.',
      messages,
      'add the first one',
      toolResults
    )

    expect(reply).toContain('Training Ball')
    expect(reply).not.toContain('Your cart is empty')
  })

  it('keeps cart confirmation when add_to_cart succeeded', () => {
    const messages = [
      {
        role: 'tool',
        content: JSON.stringify({
          id: '507f1f77bcf86cd799439011',
          name: 'Training Ball',
          description: 'Leather ball',
          colors: ['White'],
          sizes: ['Standard'],
        }),
      },
    ]
    const toolResults = [
      {
        toolName: 'add_to_cart',
        success: true,
        cart: { items: [{ name: 'Training Ball', qty: 1 }], itemCount: 1, total: 499 },
      },
    ]

    const reply = formatAgentReply(
      "I've added this to your cart:\n\n• **1 × Training Ball**",
      messages,
      'add it',
      toolResults
    )

    expect(reply).toContain('added this to your cart')
    expect(reply).not.toContain('Available colors')
  })

  it('drops spurious empty-cart replies for ordinal catalog picks', () => {
    const listingHistory = [
      {
        role: 'assistant',
        content:
          '1. **APT Grand Edition Complete Cricket Kit MRF** — ₹3,989 · [View product](/products/507f1f77bcf86cd799439012)',
      },
      {
        role: 'tool',
        content: JSON.stringify({
          id: '507f1f77bcf86cd799439012',
          name: 'APT Grand Edition Complete Cricket Kit MRF',
          description: 'Complete kit',
          colors: ['Red'],
          sizes: ['M', 'L'],
          price: 3989,
        }),
      },
    ]

    const reply = formatAgentReply(
      'Cart is empty',
      listingHistory,
      'I need the first one',
      [{ toolName: 'get_cart', cart: { items: [] } }]
    )

    expect(reply).toContain('APT Grand Edition')
    expect(reply).not.toMatch(/cart is empty/i)
  })

  it('rebuilds catalog listings that lack product links', () => {
    const toolResults = [
      {
        toolName: 'search_products',
        count: 2,
        products: [
          {
            id: '507f1f77bcf86cd799439012',
            name: 'APT Grand Edition Complete Cricket Kit MRF',
            price: 3989,
            qtyLeft: 20,
            productUrl: '/products/507f1f77bcf86cd799439012',
          },
        ],
      },
    ]

    const llmReply =
      'I found products:\n\n1. **APT Grand Edition Complete Cricket Kit MRF** — ₹3,989 · View product'
    const fixed = ensureSearchCatalogReply(llmReply, toolResults, 'cricket kit')

    expect(replyHasCatalogProductLinks(fixed)).toBe(true)
    expect(fixed).toContain('/products/507f1f77bcf86cd799439012')
  })
})

describe('buildProductDetailReply', () => {
  it('describes no-size products without asking for size', () => {
    const reply = buildProductDetailReply({
      id: '507f1f77bcf86cd799439011',
      name: 'Gift Card',
      description: 'Store credit',
      price: 1000,
      colors: ['Default'],
      sizes: [],
      sizeMeasurementType: 'none',
      inStock: true,
    })

    expect(reply).toContain('No size selection required')
    expect(reply).toContain('quantity')
    expect(reply).not.toContain('preferred **size**, **color**')
  })
})
