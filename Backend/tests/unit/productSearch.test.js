import { describe, it, expect } from 'vitest'
import {
  buildProductSearchFilter,
  scoreProductForQuery,
  rankProductsByQuery,
  trimToRelevantProducts,
} from '../../services/productSearch.js'

describe('productSearch', () => {
  it('builds empty filter when no args', () => {
    expect(buildProductSearchFilter({})).toEqual({})
  })

  it('builds regex filter for query words', () => {
    const filter = buildProductSearchFilter({ query: 'cricket ball' })
    expect(filter.$and).toBeDefined()
    expect(filter.$and.length).toBeGreaterThan(0)
  })

  it('escapes regex metacharacters in color filters', () => {
    const malicious = '(a+)+$'
    const colorFilter = buildProductSearchFilter({ color: malicious })

    expect(colorFilter.$and[0].colors.$regex).toBe('\\(a\\+\\)\\+\\$')
  })

  it('filters by brand ObjectId refs', () => {
    const brandId = '507f1f77bcf86cd799439011'
    const brandFilter = buildProductSearchFilter({ brandIds: [brandId] })
    expect(brandFilter.$and[0].brand).toBe(brandId)
  })

  it('scores name matches higher than unrelated products', () => {
    const ball = { name: 'Cricket Ball Pro', description: '', tags: [], brand: '', category: '' }
    const bat = { name: 'Cricket Bat', description: 'for cricket', tags: ['cricket'], brand: '', category: '' }
    const ballScore = scoreProductForQuery(ball, 'cricket ball')
    const batScore = scoreProductForQuery(bat, 'cricket ball')
    expect(ballScore).toBeGreaterThan(batScore)
  })

  it('ranks products by relevance', () => {
    const products = [
      { name: 'Random Mug', description: '', tags: [], brand: '', category: '' },
      { name: 'Winter Blanket', description: 'cozy warm', tags: ['winter'], brand: '', category: '' },
    ]
    const ranked = rankProductsByQuery(products, 'cozy winter')
    expect(ranked[0].name).toBe('Winter Blanket')
  })
})

describe('trimToRelevantProducts', () => {
  it('keeps only the truly relevant tail when later items share a single weak token', () => {
    const products = [
      { name: 'Cricket Bat MRF Pro', description: 'cricket bat', tags: ['cricket', 'bat'], brand: 'MRF', category: 'sports' },
      { name: 'SS Cricket Bat', description: 'english willow cricket bat', tags: ['cricket', 'bat'], brand: 'SS', category: 'sports' },
      { name: 'SG Cricket Bat', description: 'kashmir willow cricket bat', tags: ['cricket', 'bat'], brand: 'SG', category: 'sports' },
      { name: 'Cricket Helmet', description: 'protective gear', tags: ['cricket'], brand: 'SG', category: 'sports' },
      { name: 'Cricket Gloves', description: 'batting gloves', tags: ['cricket'], brand: 'SS', category: 'sports' },
    ]
    const kept = trimToRelevantProducts(products, 'cricket bat')
    const names = kept.map((p) => p.name)
    expect(names).toEqual(
      expect.arrayContaining(['Cricket Bat MRF Pro', 'SS Cricket Bat', 'SG Cricket Bat'])
    )
    expect(names).not.toContain('Cricket Helmet')
    expect(names).not.toContain('Cricket Gloves')
  })

  it('drops products with no lexical overlap (zero-score tail)', () => {
    const products = [
      { name: 'Cricket Ball Pro', description: 'leather ball', tags: ['cricket'], brand: 'SG', category: 'sports' },
      { name: 'Yoga Mat', description: 'foam mat', tags: ['yoga'], brand: '', category: 'fitness' },
    ]
    const kept = trimToRelevantProducts(products, 'cricket ball')
    expect(kept).toHaveLength(1)
    expect(kept[0].name).toBe('Cricket Ball Pro')
  })

  it('returns top scoring fallback when relative cut would zero out everything', () => {
    const products = [
      { name: 'Cricket Bat', description: '', tags: [], brand: '', category: '' },
    ]
    const kept = trimToRelevantProducts(products, 'cricket bat')
    expect(kept).toHaveLength(1)
  })

  it('respects maxResults cap', () => {
    const products = Array.from({ length: 20 }, (_, i) => ({
      name: `Cricket Bat #${i}`,
      description: 'cricket bat',
      tags: ['cricket'],
      brand: '',
      category: '',
    }))
    const kept = trimToRelevantProducts(products, 'cricket bat', 5)
    expect(kept.length).toBeLessThanOrEqual(5)
  })
})
