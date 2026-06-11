import { describe, it, expect } from 'vitest'
import { productsListCacheKey, CACHE_KEYS } from '../../constants/cacheKeys.js'

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
    expect(otherPage).not.toBe(base)
    expect(otherBrand).not.toBe(base)
  })
})
