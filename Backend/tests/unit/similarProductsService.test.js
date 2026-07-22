import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../model/Product.js', () => ({
  default: {
    findById: vi.fn(),
    find: vi.fn(),
  },
}))

vi.mock('../../services/search/vectorSearch.js', () => ({
  vectorSearch: vi.fn(),
}))

vi.mock('../../utils/brandRef.js', () => ({
  enrichProductsWithBrandNames: vi.fn(async (products) => products),
  brandDisplayName: (brand) => (typeof brand === 'string' ? brand : brand?.name || ''),
}))

vi.mock('../../utils/categoryRef.js', () => ({
  enrichProductsWithCategoryNames: vi.fn(async (products) => products),
  categoryDisplayName: (category) => (typeof category === 'string' ? category : category?.name || ''),
}))

vi.mock('../../services/cacheService.js', () => ({
  get: vi.fn(async () => null),
  set: vi.fn(async () => true),
}))

vi.mock('../../services/search/embeddingService.js', () => ({
  // dot product / (||a|| * ||b||) — the test picks vectors where result > 0.35 threshold
  cosineSimilarity: (a, b) => {
    if (!a?.length || !b?.length) return 0
    let dot = 0
    let na = 0
    let nb = 0
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i]
      na += a[i] * a[i]
      nb += b[i] * b[i]
    }
    const denom = Math.sqrt(na) * Math.sqrt(nb)
    return denom === 0 ? 0 : dot / denom
  },
}))

import Product from '../../model/Product.js'
import { vectorSearch } from '../../services/search/vectorSearch.js'
import { getSimilarProducts } from '../../services/similarProductsService.js'

function mockFindOnce(returnValue, { withSort = false, withLimit = true } = {}) {
  const lean = vi.fn(async () => returnValue)
  const limit = vi.fn(() => ({ lean }))
  const sort = vi.fn(() => ({ limit }))
  const select = vi.fn(() => {
    if (withSort) return { sort }
    if (withLimit) return { limit, lean }
    return { lean }
  })
  Product.find.mockReturnValueOnce({ select })
  return { select, sort, limit, lean }
}

describe('similarProductsService (simple mode)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('uses in-process cosine + category filter when embedding exists (no Atlas call)', async () => {
    const sourceId = '507f1f77bcf86cd799439011'
    const neighborId = '507f1f77bcf86cd799439012'

    Product.findById.mockReturnValue({
      select: () => ({
        lean: async () => ({
          _id: sourceId,
          embedding: [1, 0, 0],
          category: 'cat1',
        }),
      }),
    })

    // First find(): candidate load (id + embedding, uses limit); second find(): hydrate (no limit).
    mockFindOnce([{ _id: neighborId, embedding: [0.9, 0.1, 0] }])
    mockFindOnce(
      [
        {
          _id: neighborId,
          name: 'Neighbor Bat',
          brand: 'SG',
          price: 1200,
          totalQty: 10,
          totalSold: 2,
          colors: ['red'],
          sizes: ['6'],
          images: ['https://example.com/bat.jpg'],
          description: 'Similar bat',
        },
      ],
      { withLimit: false }
    )

    const result = await getSimilarProducts(sourceId, { limit: 4, skipCache: true })

    expect(vectorSearch).not.toHaveBeenCalled()
    expect(result.mode).toBe('vector_neighbors')
    expect(result.count).toBe(1)
    expect(result.products[0].name).toBe('Neighbor Bat')
    expect(result.grounded).toBe(true)
  })

  it('falls back to same category when no embedding', async () => {
    const sourceId = '507f1f77bcf86cd799439011'

    Product.findById.mockReturnValue({
      select: () => ({
        lean: async () => ({
          _id: sourceId,
          category: 'cat1',
        }),
      }),
    })

    mockFindOnce(
      [
        {
          _id: '507f1f77bcf86cd799439013',
          name: 'Category Pick',
          brand: 'MRF',
          price: 900,
          totalQty: 5,
          totalSold: 0,
          colors: [],
          sizes: [],
          images: [],
          description: 'Fallback',
        },
      ],
      { withSort: true }
    )

    const result = await getSimilarProducts(sourceId, { skipCache: true })

    expect(vectorSearch).not.toHaveBeenCalled()
    expect(result.mode).toBe('category_fallback')
    expect(result.products[0].name).toBe('Category Pick')
  })

  it('returns cached payload when present', async () => {
    const { get } = await import('../../services/cacheService.js')
    const cached = {
      products: [{ id: 'p1', name: 'Cached' }],
      count: 1,
      mode: 'vector_neighbors',
      sourceProductId: 'src',
      grounded: true,
      explanation: 'from cache',
    }
    get.mockResolvedValueOnce(cached)

    const result = await getSimilarProducts('src', { limit: 4 })

    expect(result).toEqual(cached)
    expect(Product.findById).not.toHaveBeenCalled()
  })
})
