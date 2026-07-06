export const SITE_NAME = 'ShopAI'

export const DEFAULT_DESCRIPTION =
  'ShopAI — AI-powered shopping for products, orders, cart checkout, and personalized recommendations across India.'

function normalizeSiteUrl(value) {
  return String(value || '').trim().replace(/\/+$/, '')
}

const configuredSiteUrl = normalizeSiteUrl(process.env.REACT_APP_SITE_URL)
const fallbackSiteUrl =
  typeof window !== 'undefined' && window.location?.origin
    ? window.location.origin
    : 'http://localhost:3000'

/** Canonical storefront origin (set REACT_APP_SITE_URL in production). */
export const siteUrl = configuredSiteUrl || fallbackSiteUrl

export function absoluteUrl(path = '/') {
  if (!path) return siteUrl
  if (/^https?:\/\//i.test(path)) return path
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${siteUrl}${normalizedPath}`
}

/** Strip markdown-ish noise and clamp for meta description tags. */
export function truncateMeta(text, maxLength = 160) {
  if (!text) return ''
  const plain = String(text)
    .replace(/!\[[^\]]*]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)]\([^)]*\)/g, '$1')
    .replace(/[#>*_`~-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (plain.length <= maxLength) return plain
  return `${plain.slice(0, maxLength - 1).trimEnd()}…`
}

/** Prefer a reasonably sized OG image when the source is Cloudinary. */
export function ogImageUrl(url) {
  if (!url || typeof url !== 'string') return absoluteUrl('/logo512.png')
  if (!url.includes('res.cloudinary.com') || !url.includes('/upload/')) return url

  const transforms = 'w_1200,h_630,c_limit,q_auto:good,f_auto'
  const parts = url.split('/upload/')
  if (parts.length !== 2 || parts[1].startsWith('w_')) return url
  return `${parts[0]}/upload/${transforms}/${parts[1]}`
}

export function productPath(id) {
  return `/products/${id}`
}

export function categoryShopPath(categoryName) {
  return `/products-filters?category=${encodeURIComponent(categoryName)}`
}
