import { describe, it, expect } from 'vitest'
import {
  buildChatBlocks,
  normalizeListingProduct,
} from '../../services/chatBlocks.js'

describe('chatBlocks', () => {
  it('builds product_listing and quick_actions blocks', () => {
    const toolResults = [
      {
        toolName: 'search_products',
        count: 2,
        products: [
          {
            id: '507f1f77bcf86cd799439011',
            name: 'Cricket Bat',
            price: 2899,
            qtyLeft: 10,
            inStock: true,
            images: ['https://example.com/bat.jpg'],
            productUrl: '/products/507f1f77bcf86cd799439011',
          },
          {
            id: '507f1f77bcf86cd799439012',
            name: 'Cricket Ball',
            price: 499,
            qtyLeft: 20,
            inStock: true,
            productUrl: '/products/507f1f77bcf86cd799439012',
          },
        ],
      },
    ]

    const blocks = buildChatBlocks({ toolResults, messageKind: 'product_listing' })
    expect(blocks).toHaveLength(2)
    expect(blocks[0].type).toBe('product_listing')
    expect(blocks[0].products).toHaveLength(2)
    expect(blocks[0].products[0].image).toBe('https://example.com/bat.jpg')
    expect(blocks[1].type).toBe('quick_actions')
    expect(blocks[1].actions[0].label).toBe('1st')
  })

  it('builds product_detail block with truncated description', () => {
    const longDesc = 'A'.repeat(250)
    const blocks = buildChatBlocks({
      messageKind: 'product_detail',
      toolResults: [
        {
          toolName: 'get_product_details',
          id: '507f1f77bcf86cd799439011',
          name: 'Bat',
          price: 100,
          description: longDesc,
          sizes: ['24', '25', '26', '27', '28'],
          colors: ['Red'],
          qtyLeft: 5,
          inStock: true,
        },
      ],
    })

    expect(blocks[0].type).toBe('product_detail')
    expect(blocks[0].product.description.length).toBeLessThan(longDesc.length)
    expect(blocks[0].product.sizeSummary).toBe('24–28')
  })

  it('normalizes listing products', () => {
    const p = normalizeListingProduct({
      _id: '507f1f77bcf86cd799439011',
      name: ' Bat ',
      price: '1200',
      images: ['img.jpg'],
    })
    expect(p.id).toBe('507f1f77bcf86cd799439011')
    expect(p.name).toBe('Bat')
    expect(p.price).toBe(1200)
  })

  it('builds cart_summary block', () => {
    const blocks = buildChatBlocks({
      messageKind: 'cart_confirm',
      toolResults: [
        {
          toolName: 'add_to_cart',
          success: true,
          cart: {
            itemCount: 2,
            total: 5798,
            items: [
              {
                _id: '507f1f77bcf86cd799439011',
                name: 'Bat',
                qty: 2,
                size: '28',
                color: 'Red',
                price: 2899,
                totalPrice: 5798,
              },
            ],
          },
        },
      ],
    })
    expect(blocks.some((b) => b.type === 'cart_summary')).toBe(true)
  })
})
