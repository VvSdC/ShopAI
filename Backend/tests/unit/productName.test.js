import { describe, it, expect } from 'vitest'
import Product from '../../model/Product.js'
import {
  findProductByNameCaseInsensitive,
  trimProductName,
  PRODUCT_NAME_COLLATION,
} from '../../utils/productName.js'

describe('productName', () => {
  it('trimProductName trims whitespace', () => {
    expect(trimProductName('  Nike Air  ')).toBe('Nike Air')
  })

  it('findProductByNameCaseInsensitive matches differing case', async () => {
    const name = `Case Find ${Date.now()}`
    await Product.collection.insertOne({ name })

    const found = await findProductByNameCaseInsensitive(name.toLowerCase())
    expect(found?.name).toBe(name)
  })

  it('exports collation for case-insensitive unique index', () => {
    expect(PRODUCT_NAME_COLLATION).toEqual({ locale: 'en', strength: 2 })
  })
})
