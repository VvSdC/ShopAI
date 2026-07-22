import Product from '../model/Product.js'
import Category from '../model/Category.js'
import { resolveCategoryId } from '../utils/categoryRef.js'
import {
  SITE_NAME,
  DEFAULT_DESCRIPTION,
  escapeHtml,
  storefrontUrl,
  truncateMeta,
  ogImageUrl,
} from './seoMeta.js'

function previewHtml({ title, description, url, image, redirectPath }) {
  const pageTitle = escapeHtml(title ? `${title} | ${SITE_NAME}` : SITE_NAME)
  const metaDescription = escapeHtml(truncateMeta(description || DEFAULT_DESCRIPTION))
  const canonicalUrl = escapeHtml(url)
  const shareImage = escapeHtml(ogImageUrl(image))
  const redirectUrl = escapeHtml(storefrontUrl(redirectPath || '/'))

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${pageTitle}</title>
  <meta name="description" content="${metaDescription}" />
  <link rel="canonical" href="${canonicalUrl}" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="${escapeHtml(SITE_NAME)}" />
  <meta property="og:title" content="${pageTitle}" />
  <meta property="og:description" content="${metaDescription}" />
  <meta property="og:url" content="${canonicalUrl}" />
  <meta property="og:image" content="${shareImage}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${pageTitle}" />
  <meta name="twitter:description" content="${metaDescription}" />
  <meta name="twitter:image" content="${shareImage}" />
  <meta http-equiv="refresh" content="0;url=${redirectUrl}" />
</head>
<body>
  <p><a href="${redirectUrl}">Continue to ${escapeHtml(SITE_NAME)}</a></p>
</body>
</html>`
}

export async function buildProductPreviewHtml(productId) {
  const product = await Product.findById(productId).populate('category', 'name').lean()
  if (!product) return null

  const path = `/products/${product._id}`
  return previewHtml({
    title: product.name,
    description: product.description,
    url: storefrontUrl(path),
    image: product.images?.[0],
    redirectPath: path,
  })
}

export async function buildCategoryPreviewHtml(categoryName) {
  const categoryId = await resolveCategoryId(categoryName)
  if (!categoryId) return null

  const category = await Category.findById(categoryId).lean()
  if (!category) return null

  const path = `/products-filters?category=${encodeURIComponent(category.name)}`
  return previewHtml({
    title: `${category.name} products`,
    description: `Browse ${category.name} on ${SITE_NAME}.`,
    url: storefrontUrl(path),
    image: category.image,
    redirectPath: path,
  })
}
