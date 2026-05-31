import { describe, it, expect } from 'vitest'
import {
  buildProductSearchFilter,
  scoreProductForQuery,
  rankProductsByQuery,
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
