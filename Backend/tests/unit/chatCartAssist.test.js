import { describe, it, expect } from 'vitest'
import {
  scoreProductMatch,
  resolveMultipleProductsFromContext,
  resolveProductIdFromContext,
  parseQuantityIntent,
  isKitBundleQuery,
  isExplicitAddIntent,
  getPendingCartProductName,
} from '../../services/chatGraph/productContext.js'
import {
  resolveColorForProduct,
  resolveSizeForProduct,
  isBallLikeProduct,
} from '../../services/cartVariantMatch.js'
import { parseCartQueueFromHistory, embedCartQueue } from '../../services/cartQueue.js'

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

describe('multi-product context', () => {
  it('matches bat and ball from typo-heavy add message', () => {
    const multi = resolveMultipleProductsFromContext(
      cricketHistory,
      'Add Kookaburra criocket bat english wiollow and leather ball 2 each'
    )
    expect(multi.length).toBeGreaterThanOrEqual(2)
    expect(multi.some((p) => /bat/i.test(p.name))).toBe(true)
    expect(multi.some((p) => /ball/i.test(p.name))).toBe(true)
  })

  it('parses 2 each quantity', () => {
    expect(parseQuantityIntent('leather ball 2 each')).toBe(2)
  })

  it('does not treat "you can add" as explicit customer add', () => {
    expect(isExplicitAddIntent('You can add them to the cart')).toBe(false)
  })
})

describe('cartVariantMatch', () => {
  it('maps closer to red to cherry', () => {
    const color = resolveColorForProduct(null, ['cherry', 'white', 'light pink'], 'closer to red')
    expect(color).toBe('cherry')
  })

  it('skips apparel size requirement for balls', () => {
    expect(isBallLikeProduct('Kookaburra leather ball')).toBe(true)
    const size = resolveSizeForProduct(null, ['XXL', 'XL'], 'Kookaburra leather ball', '')
    expect(size).toBe('XXL')
  })

  it('scores bat and ball separately', () => {
    expect(scoreProductMatch('Kookaburra leather ball', 'leather ball')).toBeGreaterThan(2)
    expect(scoreProductMatch('Kookaburra cricket bat (EnglishWillow)', 'kookaburra bat')).toBeGreaterThan(2)
  })
})

describe('cart queue', () => {
  it('embeds and parses queue marker', () => {
    const reply = embedCartQueue('Need color', {
      remaining: [{ productId: '507f1f77bcf86cd799439014', name: 'ball', qty: 2 }],
    })
    const queue = parseCartQueueFromHistory([{ role: 'assistant', content: reply }])
    expect(queue.remaining).toHaveLength(1)
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

describe('kit intent', () => {
  it('detects kit queries', () => {
    expect(isKitBundleQuery('Can I buy a cricket kit?')).toBe(true)
  })
})

describe('gender-aware product match', () => {
  const shirtHistory = [
    {
      role: 'assistant',
      content: `1. **Jack & Jones Men's Red Casual Shirt** — [View product](/products/507f1f77bcf86cd799439011)
2. **Nike Women's Red Classic T‑Shirt** — [View product](/products/507f1f77bcf86cd799439012)`,
    },
  ]

  it("prefers men's shirt for mens tshirts request", () => {
    const id = resolveProductIdFromContext(shirtHistory, "3 men's tshirts please")
    expect(id).toBe('507f1f77bcf86cd799439011')
  })
})
