import { describe, it, expect } from 'vitest'
import {
  normalizePaymentStatus,
  isPaidPaymentStatus,
  PAYMENT_STATUS,
} from '../../utils/paymentStatus.js'

describe('paymentStatus', () => {
  it('normalizes legacy unpaid values', () => {
    expect(normalizePaymentStatus('Not paid')).toBe(PAYMENT_STATUS.UNPAID)
    expect(normalizePaymentStatus('unpaid')).toBe(PAYMENT_STATUS.UNPAID)
  })

  it('detects paid status case-insensitively', () => {
    expect(isPaidPaymentStatus('paid')).toBe(true)
    expect(isPaidPaymentStatus('PAID')).toBe(true)
    expect(isPaidPaymentStatus('unpaid')).toBe(false)
  })
})
