import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  isProductCatalogOrdinalPick,
  lastAssistantMentionsAddressPicker,
  parseAddressSelection,
  runCheckoutAssist,
} from '../../services/chatCheckoutAssist.js'

vi.mock('../../services/addressService.js', () => ({
  listShippingAddresses: vi.fn(),
}))

vi.mock('../../services/checkoutFromCart.js', () => ({
  previewCheckout: vi.fn(),
  checkoutFromCart: vi.fn(),
}))

const productListingHistory = [
  {
    role: 'assistant',
    content: `I found 6 products in our catalog that match:

SG Cricket Balls Super 50 — ₹549 · 50 in stock · View product
SG Shield 20 Cricket Balls — ₹464 · 50 in stock · View product`,
  },
]

const addressPickerHistory = [
  {
    role: 'assistant',
    content:
      'You have **2** saved shipping addresses:\n\n1. Home · **Bangalore, Karnataka**\n\nReply **1** or **2**',
  },
]

const addresses = [
  { choiceNumber: 1, city: 'Bangalore', province: 'Karnataka', address: '1 Main St', postalCode: '560001' },
  { choiceNumber: 2, city: 'Mumbai', province: 'Maharashtra', address: '2 Park Ave', postalCode: '400001' },
]

describe('chatCheckoutAssist address selection', () => {
  it('does not treat catalog ordinal picks as address selection', () => {
    expect(isProductCatalogOrdinalPick('I need the second one', productListingHistory)).toBe(true)
    expect(parseAddressSelection('I need the second one', addresses, productListingHistory)).toBeNull()
    expect(parseAddressSelection('the second', addresses, productListingHistory)).toBeNull()
  })

  it('still parses address picks when the assistant showed the address picker', () => {
    expect(lastAssistantMentionsAddressPicker(addressPickerHistory)).toBe(true)
    expect(parseAddressSelection('2', addresses, addressPickerHistory)?.city).toBe('Mumbai')
    expect(parseAddressSelection('second', addresses, addressPickerHistory)?.city).toBe('Mumbai')
  })

  it('does not parse bare numbers outside address-picker context', () => {
    expect(parseAddressSelection('2', addresses, productListingHistory)).toBeNull()
  })
})

describe('runCheckoutAssist', () => {
  beforeEach(async () => {
    const { listShippingAddresses } = await import('../../services/addressService.js')
    const { previewCheckout } = await import('../../services/checkoutFromCart.js')
    listShippingAddresses.mockResolvedValue({ addresses })
    previewCheckout.mockResolvedValue({ ready: false, missing: ['cart_items'] })
  })

  it('skips checkout assist for catalog ordinal product picks', async () => {
    const result = await runCheckoutAssist(
      'user1',
      'I need the second one',
      productListingHistory,
      []
    )

    expect(result.reply).toBeNull()
  })
})
