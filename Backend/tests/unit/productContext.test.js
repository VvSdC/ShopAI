import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  extractProductsFromHistory,
  extractProductsFromLastListing,
  isKitBundleQuery,
  isExplicitAddIntent,
  getPendingCartProductName,
  parseQuantityIntent,
  parseListingNamesFromContent,
  resolveOrdinalCatalogProduct,
  isCatalogOrdinalSelection,
} from '../../services/chatGraph/productContext.js'
import { buildProductDetailReply } from '../../services/chatPostProcess.js'
import { routeIntentHeuristic } from '../../services/chatGraph/routerHeuristic.js'

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

const kitListingHistory = [
  {
    role: 'assistant',
    content: `I found 8 products in our catalog that match:

1. **APT Grand Edition Complete Cricket Kit MRF** — ₹3,989 · 20 in stock · [View product](/products/507f1f77bcf86cd799439012)
2. **DSC Spliit with Helmet Junior Kashmir Willow Cricket Kit for Juniors** — ₹7,549 · 50 in stock · [View product](/products/507f1f77bcf86cd799439013)`,
  },
]

const shirtListingHistory = [
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

  it('resolves ordinal picks from the latest listing only', () => {
    const items = extractProductsFromLastListing(kitListingHistory)
    expect(items).toHaveLength(2)

    const first = resolveOrdinalCatalogProduct('I need the first one', kitListingHistory)
    expect(first?.id).toBe('507f1f77bcf86cd799439012')
    expect(first?.name).toContain('APT Grand Edition')

    const second = resolveOrdinalCatalogProduct('give me the second one', kitListingHistory)
    expect(second?.id).toBe('507f1f77bcf86cd799439013')
  })

  it('resolves ordinals from persisted catalogProducts when links are missing', () => {
    const history = [
      {
        role: 'assistant',
        content:
          'I found 8 products in our catalog that match:\n\n1. **APT Grand Edition Complete Cricket Kit MRF** — ₹3,989 · View product',
        catalogProducts: [
          { id: '507f1f77bcf86cd799439012', name: 'APT Grand Edition Complete Cricket Kit MRF' },
          { id: '507f1f77bcf86cd799439013', name: 'DSC Spliit with Helmet Junior Kashmir Willow Cricket Kit for Juniors' },
        ],
      },
    ]

    expect(extractProductsFromLastListing(history)).toHaveLength(2)
    expect(resolveOrdinalCatalogProduct('the first', history)?.id).toBe('507f1f77bcf86cd799439012')
    expect(resolveOrdinalCatalogProduct('I need the first one', history)?.name).toContain('APT Grand Edition')
  })

  it('parses plain catalog lines without markdown links', () => {
    const plainListing = `I found 6 products in our catalog that match:

SG Cricket Balls Super 50 — ₹549 · 50 in stock · View product
SG Shield 20 Cricket Balls — ₹464 · 50 in stock · View product
Classic Poplar Willow Tennis Ball Cricket Bat for Adults, Boys & Girls — ₹939 · 100 in stock · View product`

    const names = parseListingNamesFromContent(plainListing)
    expect(names).toHaveLength(3)
    expect(names[1]).toBe('SG Shield 20 Cricket Balls')

    const history = [{ role: 'assistant', content: plainListing }]
    const second = resolveOrdinalCatalogProduct('I need the second one', history)
    expect(second?.name).toBe('SG Shield 20 Cricket Balls')
    expect(routeIntentHeuristic('I need the second one', history)).toBe('product_detail')
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

  it('resolves the first listing item without calling the LLM', async () => {
    const { runWithPurchaseIntentCache } = await import('../../services/purchaseIntentContext.js')
    const { resolveProductIdFromContext } = await import('../../services/chatGraph/productContext.js')
    const { chatCompletion } = await import('../../services/llmService.js')

    const id = await runWithPurchaseIntentCache(() =>
      resolveProductIdFromContext(kitListingHistory, 'I need the first one')
    )
    expect(id).toBe('507f1f77bcf86cd799439012')
    expect(chatCompletion).not.toHaveBeenCalled()
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

    expect(reply).toContain('Available size')
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

  it('does not treat ordinal catalog picks as immediate cart adds', () => {
    expect(isExplicitAddIntent('I need the first one', kitListingHistory)).toBe(false)
    expect(isCatalogOrdinalSelection('I need the first one', kitListingHistory)).toBe(true)
    expect(isExplicitAddIntent('add the first one to cart', kitListingHistory)).toBe(true)
  })

  it('routes variant replies after a product_detail message to checkout, not product_detail', () => {
    const productDetailHistory = [
      {
        role: 'assistant',
        messageKind: 'product_detail',
        content:
          '**MRF Winner Kashmir Willow Cricket Bat** \u2014 \u20b92,899\n\nIf you would like to add this to your cart, tell me your preferred **size** and **quantity**.',
        catalogProducts: [{ id: '507f1f77bcf86cd799439011', name: 'MRF Winner Kashmir Willow Cricket Bat' }],
      },
    ]
    expect(routeIntentHeuristic('2 bats 28 size', productDetailHistory)).toBe('checkout')
    expect(routeIntentHeuristic('rendu batlu 28 size', productDetailHistory)).toBe('checkout')
    expect(routeIntentHeuristic('size large red 1', productDetailHistory)).toBe('checkout')
  })

  it('does not match the bare word "size" as a product detail request', () => {
    expect(routeIntentHeuristic('what size shirts do you have', shirtListingHistory)).toBe(
      'product_detail'
    )
    // No "what/available/chart/guide" qualifier and no listing history → falls through to general
    expect(routeIntentHeuristic('size', [])).not.toBe('product_detail')
  })

  it('routes ordinal picks to product detail instead of checkout', () => {
    expect(routeIntentHeuristic('I need the first one', kitListingHistory)).toBe('product_detail')
    expect(routeIntentHeuristic('add the first one', kitListingHistory)).toBe('checkout')
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
