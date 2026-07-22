/**
 * Fetches catalog URLs from the API and writes sitemap.xml (and optional bot
 * preview redirects) into public/ before CRA build.
 *
 * Env:
 *   REACT_APP_API_URL — backend base ending in /shopai
 *   REACT_APP_SITE_URL — canonical storefront origin (optional; falls back to placeholder)
 */
const fs = require('fs')
const path = require('path')
const https = require('https')
const http = require('http')

const publicDir = path.join(__dirname, '..', 'public')
const apiBase = String(process.env.REACT_APP_API_URL || '').trim().replace(/\/+$/, '')
const siteUrl = String(process.env.REACT_APP_SITE_URL || '').trim().replace(/\/+$/, '') || 'https://example.com'

const STATIC_PATHS = [
  '/',
  '/about',
  '/products-filters',
  '/all-categories',
  '/cancellation-policy',
  '/return-refund-policy',
]

const SOCIAL_BOT_AGENTS = [
  'facebookexternalhit',
  'Facebot',
  'Twitterbot',
  'WhatsApp',
  'LinkedInBot',
  'Slackbot',
  'TelegramBot',
  'Discordbot',
  'Googlebot',
  'bingbot',
  'Applebot',
].join(',')

function escapeXml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function fetchText(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http
    client
      .get(url, (res) => {
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          fetchText(res.headers.location).then(resolve).catch(reject)
          return
        }
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode} for ${url}`))
          res.resume()
          return
        }
        let data = ''
        res.setEncoding('utf8')
        res.on('data', (chunk) => {
          data += chunk
        })
        res.on('end', () => resolve(data))
      })
      .on('error', reject)
  })
}

function urlEntry(loc, lastmod) {
  return [
    '  <url>',
    `    <loc>${escapeXml(loc)}</loc>`,
    lastmod ? `    <lastmod>${escapeXml(lastmod)}</lastmod>` : null,
    '    <changefreq>weekly</changefreq>',
    '  </url>',
  ]
    .filter(Boolean)
    .join('\n')
}

function buildStaticSitemap() {
  const entries = STATIC_PATHS.map((route) => urlEntry(`${siteUrl}${route}`))
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...entries,
    '</urlset>',
  ].join('\n')
}

function writeBotRedirects() {
  if (!apiBase) return

  const previewBase = `${apiBase}/seo/preview`
  const lines = [
    `/products/:id  ${previewBase}/product/:id  200  User-Agent=${SOCIAL_BOT_AGENTS}`,
    `/products-filters  ${previewBase}/category  200  User-Agent=${SOCIAL_BOT_AGENTS}`,
  ]

  const redirectsPath = path.join(publicDir, '_redirects')
  const startMarker = '# BEGIN shopai-bot-previews'
  const endMarker = '# END shopai-bot-previews'
  const botBlock = [startMarker, ...lines, endMarker].join('\n')

  let existing = ''
  if (fs.existsSync(redirectsPath)) {
    existing = fs.readFileSync(redirectsPath, 'utf8')
    const start = existing.indexOf(startMarker)
    const end = existing.indexOf(endMarker)
    if (start !== -1 && end !== -1) {
      existing = `${existing.slice(0, start).trimEnd()}\n\n${botBlock}\n`
    } else {
      existing = `${existing.trimEnd()}\n\n${botBlock}\n`
    }
  } else {
    existing = `${botBlock}\n`
  }

  fs.writeFileSync(redirectsPath, existing, 'utf8')
  // eslint-disable-next-line no-console
  console.log('[seo] wrote bot preview redirects to public/_redirects')
}

async function main() {
  fs.mkdirSync(publicDir, { recursive: true })

  let xml = buildStaticSitemap()

  if (apiBase) {
    try {
      xml = await fetchText(`${apiBase}/seo/sitemap.xml`)
      // eslint-disable-next-line no-console
      console.log('[seo] fetched dynamic sitemap from API')
      writeBotRedirects()
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn(
        `[seo] could not fetch sitemap from API (${error.message}); using static routes only`
      )
    }
  } else {
    // eslint-disable-next-line no-console
    console.warn('[seo] REACT_APP_API_URL not set; wrote static sitemap only')
  }

  fs.writeFileSync(path.join(publicDir, 'sitemap.xml'), xml, 'utf8')
  // eslint-disable-next-line no-console
  console.log('[seo] wrote public/sitemap.xml')
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('[seo] generate-seo-assets failed:', error)
  process.exit(1)
})
