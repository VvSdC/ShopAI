import { describe, it, expect } from 'vitest'
import { passwordSchema, PASSWORD_MIN_LENGTH } from '../../validations/passwordPolicy.js'

describe('passwordPolicy', () => {
  it('accepts passwords with 8+ chars, letters and numbers', () => {
    expect(passwordSchema.safeParse('pass1234').success).toBe(true)
  })

  it('rejects passwords shorter than 8 characters', () => {
    const result = passwordSchema.safeParse('pass12')
    expect(result.success).toBe(false)
  })

  it('rejects passwords without numbers', () => {
    const result = passwordSchema.safeParse('passwordonly')
    expect(result.success).toBe(false)
  })

  it('rejects passwords without letters', () => {
    const result = passwordSchema.safeParse('12345678')
    expect(result.success).toBe(false)
  })

  it('exports minimum length of 8', () => {
    expect(PASSWORD_MIN_LENGTH).toBe(8)
  })
})
