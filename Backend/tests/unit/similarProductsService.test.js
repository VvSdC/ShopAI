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

vi.mock('../../utils/categoryRef.js', () => ({
  enrichProductsWithCategoryNames: vi.fn(async (products) => products),
  categoryDisplayName: (category) => (typeof category === 'string' ? category : category?.name || ''),
}))

import Product from '../../model/Product.js'
import { vectorSearch } from '../../services/search/vectorSearch.js'
import { getSimilarProducts } from '../../services/similarProductsService.js'

describe('similarProductsService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('uses vector neighbors when embedding exists', async () => {
    const sourceId = '507f1f77bcf86cd799439011'
    const neighborId = '507f1f77bcf86cd799439012'

    Product.findById.mockReturnValue({
      select: () => ({
        lean: async () => ({
          _id: sourceId,
          embedding: [0.1, 0.2, 0.3],
          category: 'cat1',
        }),
      }),
    })

    vectorSearch.mockResolvedValue([
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
    ])

    const result = await getSimilarProducts(sourceId, { limit: 4 })

    expect(vectorSearch).toHaveBeenCalled()
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

    Product.find.mockReturnValue({
      select: () => ({
        sort: () => ({
          limit: () => ({
            lean: async () => [
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
          }),
        }),
      }),
    })

    const result = await getSimilarProducts(sourceId)

    expect(vectorSearch).not.toHaveBeenCalled()
    expect(result.mode).toBe('category_fallback')
    expect(result.products[0].name).toBe('Category Pick')
  })
})
