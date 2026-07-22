import { describe, it, expect } from 'vitest'
import {
  validateAddressPayload,
  normalizeIndianPhone,
  AddressValidationError,
} from '../../services/addressService.js'

const validBase = {
  first_name: 'Sridatta',
  last_name: 'Charan',
  address: '10-4, Indraprastha, Kondapur',
  city: 'Hyderabad',
  province: 'Telangana',
  postal_code: '500084',
  phone: '9876543210',
  country: 'IN',
}

describe('normalizeIndianPhone', () => {
  it('accepts a plain 10-digit mobile', () => {
    expect(normalizeIndianPhone('9876543210')).toBe('9876543210')
  })

  it('strips +91 prefix', () => {
    expect(normalizeIndianPhone('+91 9876543210')).toBe('9876543210')
    expect(normalizeIndianPhone('91-9876543210')).toBe('9876543210')
  })

  it('rejects landline / short numbers', () => {
    expect(normalizeIndianPhone('040 12345678')).toBeNull()
    expect(normalizeIndianPhone('12345')).toBeNull()
    expect(normalizeIndianPhone('')).toBeNull()
  })

  it('rejects a hallucinated number that starts with 0-5', () => {
    expect(normalizeIndianPhone('0000000000')).toBeNull()
    expect(normalizeIndianPhone('1234567890')).toBeNull()
    expect(normalizeIndianPhone('5555555555')).toBeNull()
  })

  it('rejects a placeholder text', () => {
    expect(normalizeIndianPhone('N/A')).toBeNull()
    expect(normalizeIndianPhone('not provided')).toBeNull()
  })
})

describe('validateAddressPayload', () => {
  it('accepts a fully-formed valid payload', () => {
    const result = validateAddressPayload(validBase)
    expect(result.phone).toBe('9876543210')
    expect(result.postalCode).toBe('500084')
    expect(result.country).toBe('IN')
  })

  it('marks phone as missing when no phone is provided anywhere', () => {
    const { phone: _phone, ...withoutPhone } = validBase
    expect(() => validateAddressPayload(withoutPhone)).toThrow(AddressValidationError)
    try {
      validateAddressPayload(withoutPhone)
    } catch (err) {
      expect(err.missing).toContain('phone')
      expect(err.invalid).not.toContain('phone')
    }
  })

  it('marks phone as invalid (not missing) when the LLM invents a bogus one', () => {
    try {
      validateAddressPayload({ ...validBase, phone: '0000000000' })
    } catch (err) {
      expect(err.invalid).toContain('phone')
    }
    try {
      validateAddressPayload({ ...validBase, phone: '1234567890' })
    } catch (err) {
      expect(err.invalid).toContain('phone')
    }
  })

  it('falls back to profile phone when user did not provide one', () => {
    const { phone: _phone, ...withoutPhone } = validBase
    const result = validateAddressPayload(withoutPhone, {
      fullname: 'Sridatta Charan',
      phone: '+91-9998887776',
    })
    expect(result.phone).toBe('9998887776')
  })

  it('does not fall back to a profile phone that is itself invalid', () => {
    const { phone: _phone, ...withoutPhone } = validBase
    expect(() =>
      validateAddressPayload(withoutPhone, { phone: '040-12345678' })
    ).toThrow(AddressValidationError)
  })

  it('rejects a 5-digit PIN as invalid, not missing', () => {
    try {
      validateAddressPayload({ ...validBase, postal_code: '5008' })
    } catch (err) {
      expect(err.invalid).toContain('postal_code')
    }
  })

  it('rejects an empty PIN as missing', () => {
    try {
      validateAddressPayload({ ...validBase, postal_code: '' })
    } catch (err) {
      expect(err.missing).toContain('postal_code')
    }
  })

  it('rejects a name that is all digits', () => {
    try {
      validateAddressPayload({ ...validBase, first_name: '12345' })
    } catch (err) {
      expect(err.invalid).toContain('first_name')
    }
  })

  it('rejects a city with digits', () => {
    try {
      validateAddressPayload({ ...validBase, city: 'Hyd123' })
    } catch (err) {
      expect(err.invalid).toContain('city')
    }
  })

  it('accumulates multiple missing/invalid fields', () => {
    try {
      validateAddressPayload({ address: 'x', city: '', province: '', postal_code: 'abc' })
    } catch (err) {
      expect(err.missing).toEqual(expect.arrayContaining(['city', 'province', 'phone']))
      expect(err.invalid).toEqual(expect.arrayContaining(['address', 'postal_code']))
    }
  })
})
