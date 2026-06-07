import { describe, it, expect } from 'vitest'
import { parsePurchaseIntent, inferPurchaseFromContext } from '../../services/chatGraph/productContext.js'
import {
  extractAddressDraft,
  listMissingAddressFields,
  looksLikeAddressInput,
} from '../../services/chatAddressAssist.js'
import { buildAddressMissingPrompt } from '../../services/chatMissingFields.js'
import { isCheckoutProceedIntent } from '../../services/chatIntentHelpers.js'

const shirtListingHistory = [
  {
    role: 'assistant',
    content:
      '1. **Jack & Jones Men’s Red Casual Shirt** — ₹1,899 · [View product](/products/507f1f77bcf86cd799439011)',
  },
]

describe('parsePurchaseIntent', () => {
  it('parses quantity size and color', () => {
    const intent = parsePurchaseIntent('I want 2 red shirts of extra large')
    expect(intent.qty).toBe(2)
    expect(intent.color).toBe('red')
    expect(intent.size).toBe('XL')
  })
})

describe('inferPurchaseFromContext', () => {
  it('infers purchase from size and color without add keyword', () => {
    const intent = inferPurchaseFromContext('2 red shirts extra large', shirtListingHistory)
    expect(intent?.qty).toBe(2)
    expect(intent?.color).toBe('red')
    expect(intent?.size).toBe('XL')
  })
})

describe('address assist parsing', () => {
  it('detects partial address missing phone and pin', () => {
    const draft = extractAddressDraft('Indraprastha enclave, Hyderabad, Telangana')
    const missing = listMissingAddressFields(draft, '')
    expect(missing).toContain('postal_code')
    expect(missing).toContain('phone')
  })

  it('builds human-friendly missing field prompt', () => {
    const prompt = buildAddressMissingPrompt(['postal_code', 'phone'])
    expect(prompt).toMatch(/PIN/i)
    expect(prompt).toMatch(/phone/i)
  })

  it('recognizes free-form address input', () => {
    expect(looksLikeAddressInput('10-4, Indraprastha, Hyderabad 500098, Telangana')).toBe(true)
  })
})

describe('checkout intent helpers', () => {
  it('treats yes as proceed when checkout was offered', () => {
    const history = [
      { role: 'assistant', content: 'Would you like to proceed to checkout and pay?' },
    ]
    expect(isCheckoutProceedIntent('yes', history)).toBe(true)
  })
})
