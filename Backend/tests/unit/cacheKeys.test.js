import { describe, it, expect } from 'vitest'
import {
  productsListCacheKey,
  queryEmbeddingCacheKey,
  normalizeSearchQueryForCache,
  CACHE_KEYS,
} from '../../constants/cacheKeys.js'

describe('cacheKeys', () => {
  it('builds stable product list keys for equivalent queries', () => {
    const a = productsListCacheKey({ page: 1, limit: 12, brand: 'Nike' })
    const b = productsListCacheKey({ page: 1, limit: 12, brand: 'Nike', category: '' })
    expect(a).toBe(b)
    expect(a.startsWith(CACHE_KEYS.productsListPrefix)).toBe(true)
  })

  it('differs when browse filters change', () => {
    const base = productsListCacheKey({ page: 1, limit: 12 })
    const otherPage = productsListCacheKey({ page: 2, limit: 12 })
    const otherBrand = productsListCacheKey({ page: 1, limit: 12, brand: 'Adidas' })
    const inStockOnly = productsListCacheKey({ page: 1, limit: 12, inStock: 'true' })
    expect(otherPage).not.toBe(base)
    expect(otherBrand).not.toBe(base)
    expect(inStockOnly).not.toBe(base)
  })

  it('normalizes search queries for embedding cache keys', () => {
    expect(normalizeSearchQueryForCache('  Cricket   Bat ')).toBe('cricket bat')
    const a = queryEmbeddingCacheKey('Cricket Bat', 1)
    const b = queryEmbeddingCacheKey('cricket bat', 1)
    expect(a).toBe(b)
    expect(a.startsWith(CACHE_KEYS.queryEmbeddingPrefix)).toBe(true)
  })

  it('changes query embedding cache keys when embedding version changes', () => {
    const v1 = queryEmbeddingCacheKey('running shoes', 1)
    const v2 = queryEmbeddingCacheKey('running shoes', 2)
    expect(v1).not.toBe(v2)
  })
})
