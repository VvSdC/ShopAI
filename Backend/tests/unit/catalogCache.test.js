import { describe, it, expect, vi, beforeEach } from 'vitest'

const get = vi.fn()
const set = vi.fn()
const del = vi.fn()
const delByPrefix = vi.fn()

vi.mock('../../services/cacheService.js', () => ({
  get,
  set,
  del,
  delByPrefix,
}))

describe('catalogCache', () => {
  beforeEach(() => {
    vi.resetModules()
    get.mockReset()
    set.mockReset()
    del.mockReset()
    delByPrefix.mockReset()
  })

  it('returns cached payload without calling fetch', async () => {
    get.mockResolvedValue({ items: [1] })
    const fetchFn = vi.fn()

    const { getCachedOrFetch } = await import('../../services/catalogCache.js')
    const result = await getCachedOrFetch('catalog:test', 60, fetchFn)

    expect(result).toEqual({ data: { items: [1] }, cacheHit: true })
    expect(fetchFn).not.toHaveBeenCalled()
    expect(set).not.toHaveBeenCalled()
  })

  it('fetches and caches non-null payloads', async () => {
    get.mockResolvedValue(null)
    const fetchFn = vi.fn().mockResolvedValue({ ok: true })

    const { getCachedOrFetch } = await import('../../services/catalogCache.js')
    const result = await getCachedOrFetch('catalog:test', 60, fetchFn)

    expect(result).toEqual({ data: { ok: true }, cacheHit: false })
    expect(set).toHaveBeenCalledWith('catalog:test', { ok: true }, 60)
  })

  it('does not cache null fetch results', async () => {
    get.mockResolvedValue(null)
    const fetchFn = vi.fn().mockResolvedValue(null)

    const { getCachedOrFetch } = await import('../../services/catalogCache.js')
    const result = await getCachedOrFetch('coupons:code:SAVE10', 120, fetchFn)

    expect(result).toEqual({ data: null, cacheHit: false })
    expect(set).not.toHaveBeenCalled()
  })

  it('invalidates coupon keys including code-specific entry', async () => {
    const { invalidateCouponsCache, CACHE_KEYS } = await import(
      '../../services/catalogCache.js'
    )
    await invalidateCouponsCache('save10')

    expect(del).toHaveBeenCalledWith(CACHE_KEYS.couponsActive, CACHE_KEYS.couponCode('save10'))
  })
})
