import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  looksLikeHallucinatedProductLinks,
  formatAgentReply,
  buildCatalogBackedReply,
} from '../../services/chatPostProcess.js'
import {
  inferProductQuery,
  extractSearchQuery,
  runRetrievalAssist,
} from '../../services/chatRetrievalAssist.js'

vi.mock('../../services/chatTools.js', () => ({
  executeTool: vi.fn(),
}))

import { executeTool } from '../../services/chatTools.js'

describe('chatPostProcess hallucination guards', () => {
  it('detects fake short product IDs', () => {
    const fake =
      'Here are bats:\n[View product](/products/123) - Bat by XYZ, ₹2,500'
    expect(looksLikeHallucinatedProductLinks(fake)).toBe(true)
  })

  it('accepts real Mongo product IDs', () => {
    const real =
      '[View product](/products/507f1f77bcf86cd799439011) - Kookaburra bat'
    expect(looksLikeHallucinatedProductLinks(real)).toBe(false)
  })

  it('replaces LLM reply with catalog-backed listing from toolResults', () => {
    const toolResults = [
      {
        toolName: 'search_products',
        count: 1,
        products: [
          {
            id: '507f1f77bcf86cd799439011',
            name: 'Kookaburra cricket bat (EnglishWillow)',
            price: 15599,
            inStock: true,
            qtyLeft: 3,
            productUrl: '/products/507f1f77bcf86cd799439011',
          },
        ],
      },
    ]
    const hallucinated =
      'Try [View product](/products/123) - Bat by XYZ, ₹2,500'
    const reply = formatAgentReply(hallucinated, [], 'cricket bat', toolResults)
    expect(reply).toContain('Kookaburra cricket bat')
    expect(reply).toContain('507f1f77bcf86cd799439011')
    expect(reply).not.toContain('/products/123')
  })

  it('buildCatalogBackedReply handles empty search', () => {
    const reply = buildCatalogBackedReply({
      count: 0,
      products: [],
      message: 'No products found in the catalog for this search.',
    })
    expect(reply).toContain('No products found')
  })
})

describe('chatRetrievalAssist', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('infers product query from buy intent', () => {
    expect(inferProductQuery('I want to buy a cricket bat')).toBe('cricket bat')
  })

  it('reuses prior query on browse-all follow-up', () => {
    const history = [
      { role: 'user', content: 'I want to buy a cricket bat' },
      { role: 'assistant', content: 'Could you share a brand?' },
    ]
    expect(extractSearchQuery('No I want to check all', history)).toBe('cricket bat')
  })

  it('forces search when the agent hallucinates products', async () => {
    executeTool.mockResolvedValue({
      count: 1,
      products: [
        {
          id: '507f1f77bcf86cd799439011',
          name: 'MRF cricket bat',
          price: 4500,
          inStock: true,
          qtyLeft: 2,
          productUrl: '/products/507f1f77bcf86cd799439011',
        },
      ],
    })

    const result = await runRetrievalAssist(
      'user1',
      'I want to buy a cricket bat',
      [],
      [],
      {
        route: 'retrieval',
        reply: '[View product](/products/123) - Bat by XYZ',
        toolsUsed: [],
      }
    )

    expect(executeTool).toHaveBeenCalledWith('search_products', 'user1', {
      query: 'cricket bat',
      limit: 8,
    })
    expect(result.reply).toContain('MRF cricket bat')
    expect(result.toolResults.at(-1).toolName).toBe('search_products')
  })
})
