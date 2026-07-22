import { describe, it, expect } from 'vitest'
import {
  extractCustomerPhones,
  sanitizeToolArgs,
} from '../../services/chatGraph/toolArgSanitizer.js'

describe('extractCustomerPhones', () => {
  it('collects phone numbers from the current message', () => {
    const phones = extractCustomerPhones('call me on 9876543210 please', [])
    expect([...phones]).toContain('9876543210')
  })

  it('collects phones from recent user history', () => {
    const phones = extractCustomerPhones('save the address', [
      { role: 'user', content: 'my phone is +91-9998887776' },
      { role: 'assistant', content: 'noted' },
    ])
    expect([...phones]).toContain('9998887776')
  })

  it('ignores phones that appeared only in the assistant messages', () => {
    const phones = extractCustomerPhones('ok', [
      { role: 'assistant', content: "I'll use 9876543210 for delivery" },
    ])
    expect(phones.size).toBe(0)
  })
})

describe('sanitizeToolArgs', () => {
  const base = {
    address: '10-4 Kondapur',
    city: 'Hyderabad',
    province: 'Telangana',
    postal_code: '500084',
  }

  it('drops phone the LLM invented (not in user text or profile)', () => {
    const sanitized = sanitizeToolArgs(
      'add_shipping_address',
      { ...base, phone: '9876543210' },
      { userText: 'save my address', history: [], profilePhone: null }
    )
    expect(sanitized.phone).toBeUndefined()
    expect(sanitized.address).toBe(base.address)
  })

  it('keeps phone that appears in the current user message', () => {
    const sanitized = sanitizeToolArgs(
      'add_shipping_address',
      { ...base, phone: '9876543210' },
      { userText: 'my phone is 9876543210', history: [] }
    )
    expect(sanitized.phone).toBe('9876543210')
  })

  it('keeps phone that matches the profile phone', () => {
    const sanitized = sanitizeToolArgs(
      'add_shipping_address',
      { ...base, phone: '+919998887776' },
      { userText: 'save it', history: [], profilePhone: '9998887776' }
    )
    expect(sanitized.phone).toBe('+919998887776')
  })

  it('keeps invalid phone unchanged (service layer will reject it)', () => {
    const sanitized = sanitizeToolArgs(
      'add_shipping_address',
      { ...base, phone: '0000000000' },
      { userText: 'save it', history: [] }
    )
    // Not a valid mobile — sanitizer skips it so validateAddressPayload can raise 'invalid: phone'.
    expect(sanitized.phone).toBe('0000000000')
  })

  it('ignores non-address tools', () => {
    const args = { product_id: 'p1', qty: 2 }
    const sanitized = sanitizeToolArgs('add_to_cart', args, {
      userText: 'add 2',
      history: [],
    })
    expect(sanitized).toEqual(args)
  })

  it('applies to update_shipping_address too', () => {
    const sanitized = sanitizeToolArgs(
      'update_shipping_address',
      { address_index: 0, phone: '7777777777' },
      { userText: 'update the address', history: [] }
    )
    expect(sanitized.phone).toBeUndefined()
    expect(sanitized.address_index).toBe(0)
  })
})
