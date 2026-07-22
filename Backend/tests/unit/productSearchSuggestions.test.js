import { describe, it, expect, vi, beforeEach } from 'vitest'
import Product from '../../model/Product.js'
import { searchProductSuggestions } from '../../services/search/searchService.js'

vi.mock('../../model/Product.js', () => ({
  default: {
    find: vi.fn(),
  },
}))

vi.mock('../../utils/categoryRef.js', () => ({
  resolveCategoryId: vi.fn().mockResolvedValue(null),
  enrichProductsWithCategoryNames: vi.fn(async (products) => products),
  categoryDisplayName: (value) => (typeof value === 'string' ? value : value?.name || ''),
}))

vi.mock('../../utils/brandRef.js', () => ({
  resolveBrandIds: vi.fn().mockResolvedValue([]),
  enrichProductsWithBrandNames: vi.fn(async (products) => products),
  buildProductBrandFilter: vi.fn(() => null),
  brandDisplayName: (value) => (typeof value === 'string' ? value : value?.name || ''),
}))

describe('searchProductSuggestions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns empty suggestions for short queries', async () => {
    const result = await searchProductSuggestions({ query: 'a' })
    expect(result.suggestions).toEqual([])
    expect(Product.find).not.toHaveBeenCalled()
  })

  it('returns ranked keyword matches for typeahead', async () => {
    const lean = vi.fn().mockResolvedValue([
      {
        _id: 'p1',
        name: 'Cricket Bat Pro',
        description: 'English willow bat',
        tags: ['cricket'],
        brand: 'MRF',
        category: 'Sports',
        price: 4999,
        totalQty: 10,
        totalSold: 1,
        images: ['https://example.com/bat.jpg'],
      },
      {
        _id: 'p2',
        name: 'Running Shoes',
        description: 'Lightweight trainers',
        tags: [],
        brand: 'Nike',
        category: 'Footwear',
        price: 2999,
        totalQty: 5,
        totalSold: 0,
        images: [],
      },
    ])

    Product.find.mockReturnValue({
      limit: () => ({
        select: () => ({ lean }),
      }),
    })

    const result = await searchProductSuggestions({ query: 'cricket', limit: 4 })

    expect(result.suggestions).toHaveLength(1)
    expect(result.suggestions[0].name).toBe('Cricket Bat Pro')
    expect(result.suggestions[0].productUrl).toBe('/products/p1')
  })
})
