import { describe, it, expect, vi, beforeEach } from 'vitest'
import { runProductDetailAssist } from '../../services/chatProductDetailAssist.js'

vi.mock('../../services/chatTools.js', () => ({
  executeTool: vi.fn(),
}))

vi.mock('../../model/Product.js', () => ({
  default: {
    findOne: vi.fn(),
  },
}))

const plainListingHistory = [
  { role: 'user', content: 'Find a cricket ball' },
  {
    role: 'assistant',
    content: `I found 6 products in our catalog that match:

SG Cricket Balls Super 50 — ₹549 · 50 in stock · View product
SG Shield 20 Cricket Balls — ₹464 · 50 in stock · View product`,
  },
]

describe('runProductDetailAssist', () => {
  beforeEach(async () => {
    const { executeTool } = await import('../../services/chatTools.js')
    const Product = (await import('../../model/Product.js')).default
    executeTool.mockReset()
    Product.findOne.mockReset()
  })

  it('loads product details for ordinal picks from plain listings', async () => {
    const { executeTool } = await import('../../services/chatTools.js')
    const Product = (await import('../../model/Product.js')).default

    Product.findOne.mockReturnValue({
      select: () => ({
        lean: async () => ({ _id: '507f1f77bcf86cd799439099' }),
      }),
    })

    executeTool.mockResolvedValue({
      id: '507f1f77bcf86cd799439099',
      name: 'SG Shield 20 Cricket Balls',
      description: 'Pack of 20 cricket balls',
      brand: 'SG',
      category: 'Balls',
      price: 464,
      qtyLeft: 50,
      sizes: ['Standard'],
      colors: ['White'],
      sizeMeasurementType: 'custom',
      productUrl: '/products/507f1f77bcf86cd799439099',
    })

    const result = await runProductDetailAssist(
      'user1',
      'I need the second one',
      plainListingHistory,
      []
    )

    expect(executeTool).toHaveBeenCalledWith('get_product_details', 'user1', {
      product_id: '507f1f77bcf86cd799439099',
    })
    expect(result.reply).toContain('SG Shield 20 Cricket Balls')
    expect(result.reply).not.toMatch(/cart is empty/i)
  })
})
