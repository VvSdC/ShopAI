import { describe, it, expect } from 'vitest'
import {
  detectAudienceFromQuery,
  applyAudienceFilter,
  scoreAudienceFit,
} from '../../services/search/audienceFilter.js'

describe('detectAudienceFromQuery', () => {
  it('detects men from various phrasings', () => {
    expect(detectAudienceFromQuery('mens shirt')).toBe('men')
    expect(detectAudienceFromQuery("men's t-shirt under 1000")).toBe('men')
    expect(detectAudienceFromQuery('shirt for men')).toBe('men')
    expect(detectAudienceFromQuery('boys football')).toBe('men')
  })

  it('detects women from various phrasings', () => {
    expect(detectAudienceFromQuery('womens kurti')).toBe('women')
    expect(detectAudienceFromQuery("ladies' handbag")).toBe('women')
    expect(detectAudienceFromQuery('girls dress')).toBe('women')
  })

  it('detects kids', () => {
    expect(detectAudienceFromQuery('kids toys')).toBe('kids')
    expect(detectAudienceFromQuery('children shoes')).toBe('kids')
    expect(detectAudienceFromQuery('baby socks')).toBe('kids')
  })

  it('returns null when no audience keyword present', () => {
    expect(detectAudienceFromQuery('cricket bat')).toBeNull()
    expect(detectAudienceFromQuery('running shoes')).toBeNull()
    expect(detectAudienceFromQuery('')).toBeNull()
  })
})

describe('scoreAudienceFit', () => {
  const mensShirt = {
    name: "Men's Cotton Shirt",
    tags: ['men', 'apparel'],
    category: 'Shirts',
    description: 'A cotton shirt for men.',
  }

  const womensDress = {
    name: 'Floral Dress',
    tags: ['women', 'ladies'],
    category: 'Dresses',
    description: 'For women, floral pattern.',
  }

  const unisexTee = {
    name: 'Basic Tee',
    tags: ['unisex', 'basics'],
    category: 'Tops',
    description: 'Unisex tee.',
  }

  const untagged = {
    name: 'Notebook',
    tags: [],
    category: 'Stationery',
    description: 'A notebook.',
  }

  it('returns 1 for explicit audience match', () => {
    expect(scoreAudienceFit(mensShirt, 'men')).toBe(1)
    expect(scoreAudienceFit(womensDress, 'women')).toBe(1)
  })

  it('returns -1 for explicit conflict', () => {
    expect(scoreAudienceFit(womensDress, 'men')).toBe(-1)
    expect(scoreAudienceFit(mensShirt, 'women')).toBe(-1)
  })

  it('returns 0 for unrelated / unknown items', () => {
    expect(scoreAudienceFit(untagged, 'men')).toBe(0)
    expect(scoreAudienceFit(untagged, 'women')).toBe(0)
  })

  it('keeps unisex items regardless of audience', () => {
    expect(scoreAudienceFit(unisexTee, 'men')).toBe(0)
    expect(scoreAudienceFit(unisexTee, 'women')).toBe(0)
  })
})

describe('applyAudienceFilter', () => {
  const products = [
    { name: "Men's Shirt", tags: ['men'], category: 'Shirts', description: '' },
    { name: 'Womens Kurti', tags: ['women'], category: 'Ethnic', description: '' },
    { name: 'Cricket Bat', tags: [], category: 'Sports', description: '' },
    { name: 'Unisex Tee', tags: ['unisex'], category: 'Tops', description: '' },
    { name: 'Ladies Handbag', tags: [], category: 'Bags', description: 'for ladies' },
  ]

  it('returns list unchanged when audience is null', () => {
    expect(applyAudienceFilter(products, null)).toEqual(products)
  })

  it('drops women products when filtering for men', () => {
    const men = applyAudienceFilter(products, 'men')
    const names = men.map((p) => p.name)
    expect(names).toContain("Men's Shirt")
    expect(names).not.toContain('Womens Kurti')
    expect(names).not.toContain('Ladies Handbag')
  })

  it('drops men products when filtering for women', () => {
    const women = applyAudienceFilter(products, 'women')
    const names = women.map((p) => p.name)
    expect(names).toContain('Womens Kurti')
    expect(names).toContain('Ladies Handbag')
    expect(names).not.toContain("Men's Shirt")
  })

  it('keeps unisex and unknown items regardless of audience', () => {
    const men = applyAudienceFilter(products, 'men')
    const names = men.map((p) => p.name)
    expect(names).toContain('Unisex Tee')
    expect(names).toContain('Cricket Bat')
  })
})
