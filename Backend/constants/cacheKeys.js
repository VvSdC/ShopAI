import crypto from 'crypto'
import { parseBrandFilterQuery, parseColorFilterQuery } from '../utils/parseBrandFilter.js'

export const CACHE_KEYS = {
  categoriesAll: 'catalog:categories:all',
  brandsAll: 'catalog:brands:all',
  colorsAll: 'catalog:colors:all',
  couponsActive: 'coupons:active',
  couponCode: (code) => `coupons:code:${String(code || '').toUpperCase().trim()}`,
  productsListPrefix: 'products:list:',
  queryEmbeddingPrefix: 'search:query-embed:',
}

export const CACHE_TTL = {
  categories: 60,
  brands: 60,
  colors: 60,
  couponsActive: 120,
  couponCode: 120,
  productsList: 300,
  queryEmbedding: 3600,
}

export function normalizeSearchQueryForCache(text) {
  return String(text || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

export function queryEmbeddingCacheKey(text, embeddingVersion) {
  const normalized = normalizeSearchQueryForCache(text)
  const hash = crypto
    .createHash('sha256')
    .update(normalized)
    .digest('hex')
    .slice(0, 32)
  return `${CACHE_KEYS.queryEmbeddingPrefix}v${embeddingVersion}:${hash}`
}

export function productsSearchCacheKey(args) {
  const normalized = {
    q: normalizeSearchQueryForCache(args.query),
    category: args.category || '',
    brands: (args.brands || []).slice().sort().join('|'),
    colors: (args.colors || []).slice().sort().join('|'),
    size: args.size || '',
    min_price: args.min_price ?? '',
    max_price: args.max_price ?? '',
    inStock: args.inStock ? '1' : '',
    page: args.page || 1,
    limit: args.limit || 12,
  }
  const hash = crypto
    .createHash('sha256')
    .update(JSON.stringify(normalized))
    .digest('hex')
    .slice(0, 16)
  return `${CACHE_KEYS.productsListPrefix}search:${hash}`
}

export function productsListCacheKey(query) {
  const normalized = {
    page: query.page || 1,
    limit: query.limit || 12,
    brand: parseBrandFilterQuery(query.brand).sort().join('|'),
    category: query.category || '',
    color: parseColorFilterQuery(query.color).sort().join('|'),
    size: query.size || '',
    price: query.price || '',
    inStock: query.inStock === true || query.inStock === 'true' ? '1' : '',
  }
  const hash = crypto
    .createHash('sha256')
    .update(JSON.stringify(normalized))
    .digest('hex')
    .slice(0, 16)
  return `${CACHE_KEYS.productsListPrefix}${hash}`
}
