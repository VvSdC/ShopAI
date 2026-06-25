import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  extractProductsFromHistory,
  isKitBundleQuery,
  isExplicitAddIntent,
  getPendingCartProductName,
  parseQuantityIntent,
} from '../../services/chatGraph/productContext.js'
import { buildProductDetailReply } from '../../services/chatPostProcess.js'

vi.mock('../../services/llmService.js', () => ({
  chatCompletion: vi.fn(),
}))

const history = [
  {
    role: 'assistant',
    content:
      '1. **Jack & Jones Men\'s Red Casual Shirt** — ₹1,899 · [View product](/products/507f1f77bcf86cd799439011)',
  },
]

describe('productContext catalog parsing', () => {
  it('extracts product ids from assistant listings', () => {
    const items = extractProductsFromHistory(history)
    expect(items).toHaveLength(1)
    expect(items[0].id).toBe('507f1f77bcf86cd799439011')
    expect(items[0].name).toContain('Jack & Jones')
  })
})

describe('productContext resolveProductIdFromContext', () => {
  beforeEach(async () => {
    const { chatCompletion } = await import('../../services/llmService.js')
    chatCompletion.mockReset()
  })

  it('resolves mens shirt detail requests via LLM extraction', async () => {
    const { chatCompletion } = await import('../../services/llmService.js')
    chatCompletion.mockResolvedValue({
      choices: [
        {
          message: {
            content:
              '{"intent":"product_detail","product_id":"507f1f77bcf86cd799439011","product_ids":[],"size":null,"color":null,"qty":null,"confidence":"high"}',
          },
        },
      ],
    })

    const { runWithPurchaseIntentCache } = await import('../../services/purchaseIntentContext.js')
    const { resolveProductIdFromContext } = await import('../../services/chatGraph/productContext.js')

    const id = await runWithPurchaseIntentCache(() =>
      resolveProductIdFromContext(history, 'can you give details about the mens shirt')
    )
    expect(id).toBe('507f1f77bcf86cd799439011')
  })

  it('resolves pronoun follow-ups via LLM extraction', async () => {
    const { chatCompletion } = await import('../../services/llmService.js')
    chatCompletion.mockResolvedValue({
      choices: [
        {
          message: {
            content:
              '{"intent":"product_detail","product_id":"507f1f77bcf86cd799439011","product_ids":[],"size":null,"color":null,"qty":null,"confidence":"high"}',
          },
        },
      ],
    })

    const { runWithPurchaseIntentCache } = await import('../../services/purchaseIntentContext.js')
    const { resolveProductIdFromContext } = await import('../../services/chatGraph/productContext.js')

    const id = await runWithPurchaseIntentCache(() =>
      resolveProductIdFromContext(history, 'i want more details about it')
    )
    expect(id).toBe('507f1f77bcf86cd799439011')
  })
})

describe('buildProductDetailReply', () => {
  it('includes sizes and colors', () => {
    const reply = buildProductDetailReply({
      id: '507f1f77bcf86cd799439011',
      name: 'Jack & Jones Men\'s Red Casual Shirt',
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

describe('simple cart helpers', () => {
  it('parses 2 each quantity', () => {
    expect(parseQuantityIntent('leather ball 2 each')).toBe(2)
  })

  it('does not treat "you can add" as explicit customer add', () => {
    expect(isExplicitAddIntent('You can add them to the cart')).toBe(false)
  })

  it('detects kit queries', () => {
    expect(isKitBundleQuery('Can I buy a cricket kit?')).toBe(true)
  })

  it('reads pending product from prompt', () => {
    const name = getPendingCartProductName([
      {
        role: 'assistant',
        content: 'To add **Kookaburra leather ball** to your cart, I still need:\n- **color**',
      },
    ])
    expect(name).toContain('leather ball')
  })
})
