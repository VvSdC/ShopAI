import { describe, it, expect, vi, beforeEach } from 'vitest'
import { parsePurchaseIntentJson } from '../../services/purchaseIntentExtractor.js'

vi.mock('../../services/llmService.js', () => ({
  chatCompletion: vi.fn(),
}))

const shirtHistory = [
  {
    role: 'assistant',
    content:
      '1. **Jack & Jones Men\'s Red Casual Shirt** — ₹1,899 · [View product](/products/507f1f77bcf86cd799439011)',
  },
]

const cricketHistory = [
  {
    role: 'assistant',
    content: `I found 4 products:

1. **Kookaburra cricket bat (EnglishWillow)** — ₹15,599 · [View product](/products/507f1f77bcf86cd799439011)
2. **MRF Virat Kohli Grand Edition Cricket Bat** — ₹11,997 · [View product](/products/507f1f77bcf86cd799439012)
3. **MRF Virat Kohli rare edition** — ₹25,000 · [View product](/products/507f1f77bcf86cd799439013)
4. **Kookaburra leather ball** — ₹1,999 · [View product](/products/507f1f77bcf86cd799439014)`,
  },
]

describe('parsePurchaseIntentJson', () => {
  it('parses structured cart intent', () => {
    expect(
      parsePurchaseIntentJson(
        '{"intent":"add_to_cart","product_id":"507f1f77bcf86cd799439011","product_ids":[],"size":"XL","color":"red","qty":2,"confidence":"high"}'
      )
    ).toEqual({
      intent: 'add_to_cart',
      product_id: '507f1f77bcf86cd799439011',
      product_ids: [],
      size: 'XL',
      color: 'red',
      qty: 2,
      confidence: 'high',
    })
  })

  it('rejects invalid product ids', () => {
    expect(
      parsePurchaseIntentJson(
        '{"intent":"add_to_cart","product_id":"not-an-id","product_ids":["also-bad"],"confidence":"high"}'
      )
    ).toEqual({
      intent: 'add_to_cart',
      product_id: null,
      product_ids: [],
      size: null,
      color: null,
      qty: null,
      confidence: 'high',
    })
  })
})

describe('getPurchaseIntent', () => {
  beforeEach(async () => {
    const { chatCompletion } = await import('../../services/llmService.js')
    chatCompletion.mockReset()
    const { purchaseIntentStorage } = await import('../../services/purchaseIntentContext.js')
    await import('../../services/purchaseIntentExtractor.js').then(async (mod) => {
      // reset cache between tests via fresh storage run
    })
  })

  it('extracts mens shirt selection via LLM', async () => {
    const { chatCompletion } = await import('../../services/llmService.js')
    chatCompletion.mockResolvedValue({
      choices: [
        {
          message: {
            content:
              '{"intent":"add_to_cart","product_id":"507f1f77bcf86cd799439011","product_ids":[],"size":null,"color":null,"qty":3,"confidence":"high"}',
          },
        },
      ],
    })

    const { runWithPurchaseIntentCache } = await import('../../services/purchaseIntentContext.js')
    const { getPurchaseIntent } = await import('../../services/purchaseIntentExtractor.js')

    const intent = await runWithPurchaseIntentCache(() =>
      getPurchaseIntent("3 men's tshirts please", shirtHistory)
    )

    expect(intent.product_id).toBe('507f1f77bcf86cd799439011')
    expect(intent.qty).toBe(3)
    expect(chatCompletion).toHaveBeenCalledOnce()
  })

  it('caches extraction for the same turn', async () => {
    const { chatCompletion } = await import('../../services/llmService.js')
    chatCompletion.mockResolvedValue({
      choices: [
        {
          message: {
            content:
              '{"intent":"bulk_add","product_id":null,"product_ids":["507f1f77bcf86cd799439011","507f1f77bcf86cd799439014"],"size":null,"color":null,"qty":2,"confidence":"high"}',
          },
        },
      ],
    })

    const { runWithPurchaseIntentCache } = await import('../../services/purchaseIntentContext.js')
    const { getPurchaseIntent } = await import('../../services/purchaseIntentExtractor.js')

    await runWithPurchaseIntentCache(async () => {
      const first = await getPurchaseIntent(
        'Add Kookaburra bat and leather ball 2 each',
        cricketHistory
      )
      const second = await getPurchaseIntent(
        'Add Kookaburra bat and leather ball 2 each',
        cricketHistory
      )
      expect(first.product_ids).toHaveLength(2)
      expect(second).toEqual(first)
    })

    expect(chatCompletion).toHaveBeenCalledOnce()
  })

  it('resolves product detail references via LLM', async () => {
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
    const { getPurchaseIntent } = await import('../../services/purchaseIntentExtractor.js')
    const { resolveProductIdFromContext } = await import('../../services/chatGraph/productContext.js')

    const id = await runWithPurchaseIntentCache(() =>
      resolveProductIdFromContext(shirtHistory, 'i want more details about it')
    )

    expect(id).toBe('507f1f77bcf86cd799439011')
    expect(chatCompletion).toHaveBeenCalledOnce()
  })
})
