import { describe, it, expect } from 'vitest'
import {
  extractAddressDraft,
  listMissingAddressFields,
  looksLikeAddressInput,
  lastAssistantAskedForAddressFields,
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

  it('does not treat invalid profile phone as satisfying phone requirement', () => {
    const draft = extractAddressDraft('10-4, Indraprastha, Hyderabad, Telangana 500084')
    draft.province = 'Telangana'
    const missing = listMissingAddressFields(draft, '040-12345678')
    expect(missing).toContain('phone')
  })

  it('treats city+pin last segment as city without inventing province', () => {
    const draft = extractAddressDraft('Building 7, Infosys SEZ, Pocharam, Hyderabad 500098')
    expect(draft.city).toBe('Hyderabad')
    expect(draft.postal_code).toBe('500098')
    expect(draft.address).toContain('Building 7')
    expect(listMissingAddressFields(draft, '9876543210')).toContain('province')
  })

  it('detects when the assistant is collecting address fields', () => {
    const history = [
      {
        role: 'assistant',
        content: 'To save your delivery address, I still need a few details:\n\n- **state**',
      },
    ]
    expect(lastAssistantAskedForAddressFields(history)).toBe(true)
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
