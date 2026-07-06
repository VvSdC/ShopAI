import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  escapeXml,
  truncateMeta,
  storefrontUrl,
  ogImageUrl,
} from '../../services/seoMeta.js'
import { buildSitemapXml } from '../../services/seoSitemap.js'
import { buildProductPreviewHtml } from '../../services/seoPreview.js'

vi.mock('../../model/Product.js', () => ({
  default: {
    find: vi.fn(),
    findById: vi.fn(),
  },
}))

vi.mock('../../model/Category.js', () => ({
  default: {
    find: vi.fn(),
    findById: vi.fn(),
  },
}))

import Product from '../../model/Product.js'
import Category from '../../model/Category.js'

describe('seoMeta', () => {
  it('escapes XML entities', () => {
    expect(escapeXml(`Tom & Jerry's "shop"`)).toBe(
      'Tom &amp; Jerry&apos;s &quot;shop&quot;'
    )
  })

  it('builds storefront URLs from FRONTEND_URL config', () => {
    expect(storefrontUrl('/products/1')).toContain('/products/1')
  })

  it('truncates and transforms OG image URLs', () => {
    expect(truncateMeta('# Hello **world**', 20)).toBe('Hello world')
    const image = ogImageUrl(
      'https://res.cloudinary.com/demo/image/upload/v1/x.jpg'
    )
    expect(image).toContain('w_1200,h_630')
  })
})

describe('seoSitemap', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('includes static, category, and product URLs', async () => {
    const lean = vi.fn().mockResolvedValue([
      { _id: 'p1', updatedAt: new Date('2026-01-02') },
    ])
    Product.find.mockReturnValue({ select: () => ({ lean }) })

    const catLean = vi.fn().mockResolvedValue([
      { name: 'Shoes', updatedAt: new Date('2026-01-01') },
    ])
    Category.find.mockReturnValue({ select: () => ({ lean: catLean }) })

    const xml = await buildSitemapXml()

    expect(xml).toContain('<urlset')
    expect(xml).toContain('/products/p1')
    expect(xml).toContain('category=Shoes')
    expect(xml).toContain('/about')
  })
})

describe('seoPreview', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders OG tags for a product preview page', async () => {
    Product.findById.mockReturnValue({
      populate: () => ({
        lean: async () => ({
          _id: 'p1',
          name: 'Running Shoes',
          description: 'Lightweight trainers for daily runs.',
          images: ['https://res.cloudinary.com/demo/image/upload/v1/shoe.jpg'],
          category: { name: 'Footwear' },
        }),
      }),
    })

    const html = await buildProductPreviewHtml('p1')

    expect(html).toContain('og:title')
    expect(html).toContain('Running Shoes')
    expect(html).toContain('og:image')
    expect(html).toContain('/products/p1')
  })
})
