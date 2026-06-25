import { describe, it, expect } from 'vitest'
import {
  extractAddressDraft,
  listMissingAddressFields,
  looksLikeAddressInput,
} from '../../services/chatAddressAssist.js'
import { buildAddressMissingPrompt } from '../../services/chatMissingFields.js'
import { isCheckoutProceedIntent } from '../../services/chatIntentHelpers.js'

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
