import Product from '../model/Product.js'
import Category from '../model/Category.js'
import {
  escapeXml,
  storefrontUrl,
  toIsoDate,
} from './seoMeta.js'

const STATIC_PATHS = [
  '/',
  '/about',
  '/products-filters',
  '/all-categories',
  '/cancellation-policy',
  '/return-refund-policy',
]

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

export async function buildSitemapXml() {
  const [products, categories] = await Promise.all([
    Product.find({ totalQty: { $gt: 0 } })
      .select('_id updatedAt')
      .lean(),
    Category.find().select('name updatedAt').lean(),
  ])

  const entries = [
    ...STATIC_PATHS.map((path) => urlEntry(storefrontUrl(path))),
    ...categories.map((category) =>
      urlEntry(
        storefrontUrl(
          `/products-filters?category=${encodeURIComponent(category.name)}`
        ),
        toIsoDate(category.updatedAt).slice(0, 10)
      )
    ),
    ...products.map((product) =>
      urlEntry(
        storefrontUrl(`/products/${product._id}`),
        toIsoDate(product.updatedAt).slice(0, 10)
      )
    ),
  ]

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...entries,
    '</urlset>',
  ].join('\n')
}
