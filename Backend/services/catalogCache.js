import { CACHE_KEYS, CACHE_TTL } from '../constants/cacheKeys.js'
import { get, set, del, delByPrefix } from './cacheService.js'

export async function getCachedOrFetch(key, ttlSeconds, fetchFn) {
  const cached = await get(key)
  if (cached != null) return { data: cached, cacheHit: true }
  const data = await fetchFn()
  if (data != null) {
    await set(key, data, ttlSeconds)
  }
  return { data, cacheHit: false }
}

export async function invalidateCategoriesCache() {
  await del(CACHE_KEYS.categoriesAll)
}

export async function invalidateBrandsCache() {
  await del(CACHE_KEYS.brandsAll)
}

export async function invalidateColorsCache() {
  await del(CACHE_KEYS.colorsAll)
}

export async function invalidateCouponsCache(code = null) {
  const keys = [CACHE_KEYS.couponsActive]
  if (code) keys.push(CACHE_KEYS.couponCode(code))
  await del(...keys)
}

export async function invalidateProductListCache() {
  await delByPrefix(CACHE_KEYS.productsListPrefix)
}

export { CACHE_KEYS, CACHE_TTL }
