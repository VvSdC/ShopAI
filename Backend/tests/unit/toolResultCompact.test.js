import { describe, it, expect } from 'vitest'
import {
  compactSearchProduct,
  compactProductDetail,
  compactToolResultForLlm,
  serializeToolResultForLlm,
} from '../../services/chatGraph/toolResultCompact.js'

describe('toolResultCompact', () => {
  const bloatedProduct = {
    _id: '507f1f77bcf86cd799439011',
    id: '507f1f77bcf86cd799439011',
    name: 'Red Shirt',
    brand: 'Nike',
    category: 'Shirts',
    price: 1999,
    inStock: true,
    qtyLeft: 5,
    colors: ['Red'],
    sizes: ['M', 'L'],
    productUrl: '/products/507f1f77bcf86cd799439011',
    description: 'A'.repeat(500),
    images: ['https://res.cloudinary.com/demo/image/upload/v1/shirt.jpg'],
    image: 'https://res.cloudinary.com/demo/image/upload/v1/shirt.jpg',
    tags: ['casual', 'cotton'],
    searchDocument: 'Red Shirt casual cotton',
    embedding: [0.1, 0.2, 0.3],
  }

  it('strips bloat from search list products', () => {
    const compact = compactSearchProduct(bloatedProduct)
    expect(compact).toEqual({
      id: bloatedProduct.id,
      name: bloatedProduct.name,
      brand: bloatedProduct.brand,
      category: bloatedProduct.category,
      price: bloatedProduct.price,
      inStock: true,
      qtyLeft: 5,
      colors: ['Red'],
      sizes: ['M', 'L'],
      productUrl: bloatedProduct.productUrl,
    })
    expect(compact.description).toBeUndefined()
    expect(compact.images).toBeUndefined()
    expect(compact.embedding).toBeUndefined()
  })

  it('keeps truncated description for product details', () => {
    const compact = compactProductDetail(bloatedProduct)
    expect(compact.description).toHaveLength(321)
    expect(compact.description.endsWith('…')).toBe(true)
    expect(compact.images).toBeUndefined()
    expect(compact.totalReviews).toBeUndefined()
  })

  it('compacts search_products tool payloads', () => {
    const compact = compactToolResultForLlm('search_products', {
      count: 1,
      rule: 'List exactly',
      products: [bloatedProduct],
    })
    expect(compact.products).toHaveLength(1)
    expect(compact.products[0].name).toBe('Red Shirt')
    expect(compact.products[0].images).toBeUndefined()
  })

  it('strips category image URLs', () => {
    const compact = compactToolResultForLlm('get_categories', [
      { name: 'shirts', productCount: 3, image: 'https://res.cloudinary.com/demo/cat.jpg' },
    ])
    expect(compact[0]).toEqual({ name: 'shirts', productCount: 3 })
  })

  it('strips cart item images and long descriptions', () => {
    const compact = compactToolResultForLlm('get_cart', {
      cart: {
        items: [
          {
            _id: '507f1f77bcf86cd799439011',
            name: 'Hat',
            qty: 1,
            price: 500,
            image: 'https://res.cloudinary.com/demo/hat.jpg',
            description: 'B'.repeat(300),
          },
        ],
        total: 500,
      },
    })
    expect(compact.cart.items[0].image).toBeUndefined()
    expect(compact.cart.items[0].description.length).toBeLessThan(200)
  })

  it('serializes compact payloads for tool messages', () => {
    const raw = serializeToolResultForLlm('search_products', {
      count: 1,
      products: [bloatedProduct],
    })
    const parsed = JSON.parse(raw)
    expect(parsed.products[0].searchDocument).toBeUndefined()
    expect(raw.length).toBeLessThan(JSON.stringify({ products: [bloatedProduct] }).length)
  })

  it('passes through errors unchanged', () => {
    expect(compactToolResultForLlm('search_products', { error: 'nope' })).toEqual({
      error: 'nope',
    })
  })
})
