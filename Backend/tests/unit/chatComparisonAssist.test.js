import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../services/chatTools.js', () => {
  const executeTool = vi.fn(async (name, _userId, args) => {
    if (name === 'get_product_details') {
      return {
        id: args.product_id,
        name: `Details for ${args.product_id}`,
        description: 'desc',
        price: 999,
      }
    }
    return null
  })
  return { executeTool }
})

import {
  extractOrdinalReferences,
  extractNamedProductReferences,
  resolveComparisonTargets,
  isCompareTrigger,
  runComparisonAssist,
} from '../../services/chatComparisonAssist.js'
import { executeTool as mockExec } from '../../services/chatTools.js'

const listingHistory = [
  {
    role: 'assistant',
    messageKind: 'product_listing',
    catalogProducts: [
      { id: 'aaaaaaaaaaaaaaaaaaaaaaaa', name: 'Kookaburra Cricket Bat' },
      { id: 'bbbbbbbbbbbbbbbbbbbbbbbb', name: 'SS Cricket Bat' },
      { id: 'cccccccccccccccccccccccc', name: 'SG Cricket Bat' },
    ],
    content:
      '1. **Kookaburra Cricket Bat** — ₹5000 · [View product](/products/aaaaaaaaaaaaaaaaaaaaaaaa)\n2. **SS Cricket Bat** — ₹4000 · [View product](/products/bbbbbbbbbbbbbbbbbbbbbbbb)\n3. **SG Cricket Bat** — ₹3000 · [View product](/products/cccccccccccccccccccccccc)',
  },
]

describe('isCompareTrigger', () => {
  it('recognizes common compare phrases', () => {
    expect(isCompareTrigger('compare 1 and 2')).toBe(true)
    expect(isCompareTrigger('1 vs 2')).toBe(true)
    expect(isCompareTrigger('which is better')).toBe(true)
    expect(isCompareTrigger('what is the difference between them')).toBe(true)
  })

  it('does not trigger on unrelated messages', () => {
    expect(isCompareTrigger('add 2 to cart')).toBe(false)
    expect(isCompareTrigger('show me products')).toBe(false)
  })
})

describe('extractOrdinalReferences', () => {
  it('picks up numeric ordinals', () => {
    expect(extractOrdinalReferences('compare 1 and 3')).toEqual([1, 3])
    expect(extractOrdinalReferences('#2 vs #4')).toEqual([2, 4])
    expect(extractOrdinalReferences('1st and 2nd')).toEqual([1, 2])
  })

  it('picks up word ordinals', () => {
    expect(extractOrdinalReferences('the first vs the third')).toEqual([1, 3])
  })

  it('ignores nothing when no numbers', () => {
    expect(extractOrdinalReferences('just compare them')).toEqual([])
  })
})

describe('extractNamedProductReferences', () => {
  it('matches products named in the message against the catalog', () => {
    const catalog = [
      { id: 'a', name: 'Kookaburra Cricket Bat' },
      { id: 'b', name: 'SS Cricket Bat' },
    ]
    const matches = extractNamedProductReferences(
      'compare Kookaburra Cricket Bat and SS Cricket Bat',
      catalog
    )
    expect(matches.map((m) => m.id)).toEqual(['a', 'b'])
  })
})

describe('resolveComparisonTargets', () => {
  it('resolves "compare 1 and 2" to the top two products from the last listing', () => {
    const targets = resolveComparisonTargets('compare 1 and 2', listingHistory)
    expect(targets).toHaveLength(2)
    expect(targets[0].id).toBe('aaaaaaaaaaaaaaaaaaaaaaaa')
    expect(targets[1].id).toBe('bbbbbbbbbbbbbbbbbbbbbbbb')
  })

  it('caps at 4 targets', () => {
    const bigCatalog = Array.from({ length: 6 }, (_, i) => ({
      id: String(i + 1).padEnd(24, '0'),
      name: `Product ${i + 1}`,
    }))
    const history = [
      { role: 'assistant', messageKind: 'product_listing', catalogProducts: bigCatalog, content: '' },
    ]
    const targets = resolveComparisonTargets('compare 1 2 3 4 5 6', history)
    expect(targets.length).toBeLessThanOrEqual(4)
  })
})

describe('runComparisonAssist', () => {
  beforeEach(() => {
    mockExec.mockClear()
  })

  it('does nothing when route is not comparison and message is not a compare trigger', async () => {
    const result = await runComparisonAssist('u1', 'show me shirts', listingHistory, [], {
      route: 'retrieval',
    })
    expect(result.toolResults).toEqual([])
    expect(mockExec).not.toHaveBeenCalled()
  })

  it('does nothing when fewer than 2 targets can be resolved', async () => {
    const result = await runComparisonAssist('u1', 'compare 1', listingHistory, [], {
      route: 'comparison',
    })
    expect(mockExec).not.toHaveBeenCalled()
    expect(result.toolResults).toEqual([])
  })

  it('fetches product details for each ordinal referenced in a comparison', async () => {
    const result = await runComparisonAssist('u1', 'compare 1 and 2', listingHistory, [], {
      route: 'comparison',
    })
    expect(mockExec).toHaveBeenCalledTimes(2)
    expect(result.toolResults).toHaveLength(2)
    expect(result.toolResults[0].toolName).toBe('get_product_details')
  })

  it('skips products that were already fetched by the agent', async () => {
    const priorResults = [
      {
        toolName: 'get_product_details',
        id: 'aaaaaaaaaaaaaaaaaaaaaaaa',
        name: 'Kookaburra Cricket Bat',
        description: 'x',
      },
    ]
    const result = await runComparisonAssist('u1', 'compare 1 and 2', listingHistory, priorResults, {
      route: 'comparison',
    })
    expect(mockExec).toHaveBeenCalledTimes(1)
    expect(mockExec).toHaveBeenCalledWith(
      'get_product_details',
      'u1',
      { product_id: 'bbbbbbbbbbbbbbbbbbbbbbbb' }
    )
    expect(result.toolResults).toHaveLength(2) // prior + newly fetched
  })
})
