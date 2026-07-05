import { describe, it, expect } from 'vitest'
import { AppError } from '../../utils/appError.js'
import { parseCouponDiscountPercent } from '../../utils/couponDates.js'

describe('parseCouponDiscountPercent', () => {
  it('accepts whole and fractional percentages from 1 to 100', () => {
    expect(parseCouponDiscountPercent(25)).toBe(25)
    expect(parseCouponDiscountPercent('10.5')).toBe(10.5)
    expect(parseCouponDiscountPercent(1)).toBe(1)
    expect(parseCouponDiscountPercent(100)).toBe(100)
  })

  it('rejects non-numeric values', () => {
    expect(() => parseCouponDiscountPercent('abc')).toThrow(AppError)
    expect(() => parseCouponDiscountPercent(undefined)).toThrow(/must be a number/i)
  })

  it('rejects zero, negative, and over-100 discounts', () => {
    for (const value of [0, -1, 101, 500]) {
      try {
        parseCouponDiscountPercent(value)
        throw new Error('expected throw')
      } catch (err) {
        expect(err).toBeInstanceOf(AppError)
        expect(err.statusCode).toBe(400)
        expect(err.message).toMatch(/between 1 and 100/i)
      }
    }
  })
})
