import { config } from '../config/env.js'

export const SITE_NAME = 'ShopAI'

export const DEFAULT_DESCRIPTION =
  'ShopAI — AI-powered shopping for products, orders, cart checkout, and personalized recommendations across India.'

export function storefrontOrigin() {
  const raw = String(config.cors.origin || 'http://localhost:3000').trim()
  return raw.replace(/\/+$/, '')
}

export function storefrontUrl(path = '/') {
  const origin = storefrontOrigin()
  if (!path || path === '/') return origin
  const normalized = path.startsWith('/') ? path : `/${path}`
  return `${origin}${normalized}`
}

export function escapeXml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export function escapeHtml(value) {
  return escapeXml(value)
}

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

export function ogImageUrl(url) {
  if (!url || typeof url !== 'string') return storefrontUrl('/logo512.png')
  if (!url.includes('res.cloudinary.com') || !url.includes('/upload/')) return url

  const transforms = 'w_1200,h_630,c_limit,q_auto:good,f_auto'
  const parts = url.split('/upload/')
  if (parts.length !== 2 || parts[1].startsWith('w_')) return url
  return `${parts[0]}/upload/${transforms}/${parts[1]}`
}

export function toIsoDate(value) {
  if (!value) return new Date().toISOString()
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString()
}
