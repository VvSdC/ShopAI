import { describe, it, expect, beforeEach } from 'vitest'
import Brand from '../../model/Brand.js'
import User from '../../model/User.js'
import Product from '../../model/Product.js'
import { brandDisplayName, resolveBrandId, enrichProductsWithBrandNames } from '../../utils/brandRef.js'
import { createTestBrand } from '../helpers/testBrand.js'

describe('brandRef', () => {
  let brand
  let user

  beforeEach(async () => {
    user = await User.create({
      fullname: 'Brand Ref User',
      email: `brand-ref-${Date.now()}-${Math.random()}@test.com`,
      password: 'hashed',
    })

    brand = await createTestBrand(`nike-${Date.now()}`, user)
  })

  it('resolves brand id from exact name', async () => {
    const id = await resolveBrandId(brand.name)
    expect(String(id)).toBe(String(brand._id))
  })

  it('resolves brand id from ObjectId string', async () => {
    const id = await resolveBrandId(String(brand._id))
    expect(String(id)).toBe(String(brand._id))
  })

  it('returns null for unknown brand', async () => {
    const id = await resolveBrandId('nonexistent-brand-name')
    expect(id).toBeNull()
  })

  it('brandDisplayName reads populated brand documents', () => {
    expect(brandDisplayName({ name: brand.name })).toBe(brand.name)
    expect(brandDisplayName(brand.name)).toBe(brand.name)
    expect(brandDisplayName(null)).toBe('')
  })

  it('populates brand on Product queries and flattens in JSON', async () => {
    const product = await Product.create({
      name: `Brand Populate ${Date.now()}`,
      description: 'Test',
      brand: brand._id,
      category: user._id,
      sizes: ['M'],
      colors: ['Blue'],
      user: user._id,
      images: ['https://example.com/img.jpg'],
      price: 100,
      totalQty: 5,
    })

    const loaded = await Product.findById(product._id).lean()
    const [enriched] = await enrichProductsWithBrandNames([loaded])
    expect(enriched.brand).toBeTruthy()
    expect(enriched.brand.name).toBe(brand.name)
    expect(brandDisplayName(enriched.brand)).toBe(brand.name)
  })

  it('enriches legacy string brand names without ObjectId cast errors', async () => {
    const legacyProduct = {
      _id: user._id,
      name: 'Legacy Product',
      brand: brand.name,
    }
    const [enriched] = await enrichProductsWithBrandNames([legacyProduct])
    expect(enriched.brand.name).toBe(brand.name)
  })
})
