import { describe, it, expect } from '@jest/globals'
import {
  truncateMeta,
  absoluteUrl,
  ogImageUrl,
  siteUrl,
} from './seo'

describe('seo utils', () => {
  it('truncates long descriptions for meta tags', () => {
    const long = 'word '.repeat(40).trim()
    const result = truncateMeta(long, 50)
    expect(result.length).toBeLessThanOrEqual(50)
    expect(result.endsWith('…')).toBe(true)
  })

  it('strips basic markdown from descriptions', () => {
    expect(truncateMeta('**Bold** [link](https://x.com) text')).toBe('Bold link text')
  })

  it('builds absolute URLs from site origin', () => {
    expect(absoluteUrl('/products/abc')).toBe(`${siteUrl}/products/abc`)
    expect(absoluteUrl('https://cdn.example/img.jpg')).toBe('https://cdn.example/img.jpg')
  })

  it('adds Cloudinary transforms for OG images', () => {
    const url =
      'https://res.cloudinary.com/demo/image/upload/v1/sample.jpg'
    expect(ogImageUrl(url)).toContain('w_1200,h_630')
  })
})
