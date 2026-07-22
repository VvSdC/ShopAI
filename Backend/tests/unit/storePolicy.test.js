import { describe, it, expect } from 'vitest'
import {
  STORE_POLICY,
  canCancelOrder,
  hasActiveStripeCheckout,
  getReturnWindowEnd,
  isWithinReturnWindow,
} from '../../config/storePolicy.js'

describe('storePolicy', () => {
  it('allows cancel for pending and processing only', () => {
    expect(canCancelOrder({ status: 'pending' })).toBe(true)
    expect(canCancelOrder({ status: 'processing' })).toBe(true)
    expect(canCancelOrder({ status: 'shipped' })).toBe(false)
    expect(canCancelOrder({ status: 'delivered' })).toBe(false)
    expect(canCancelOrder({ status: 'cancelled' })).toBe(false)
  })

  it('blocks cancel while Stripe checkout is open', () => {
    const future = new Date(Date.now() + 60_000)
    expect(
      hasActiveStripeCheckout({
        status: 'pending',
        paymentStatus: 'Not paid',
        stripeSessionId: 'cs_test_open',
        checkoutExpiresAt: future,
      })
    ).toBe(true)
    expect(
      canCancelOrder({
        status: 'pending',
        paymentStatus: 'Not paid',
        stripeSessionId: 'cs_test_open',
        checkoutExpiresAt: future,
      })
    ).toBe(false)
  })

  it('computes return window from delivery date', () => {
    const deliveredAt = new Date('2026-01-01T12:00:00Z')
    const end = getReturnWindowEnd(deliveredAt)
    expect(end.getDate()).toBe(4)
    expect(isWithinReturnWindow(deliveredAt, new Date('2026-01-03'))).toBe(true)
    expect(isWithinReturnWindow(deliveredAt, new Date('2026-01-10'))).toBe(false)
  })

  it('exposes configurable policy constants', () => {
    expect(STORE_POLICY.returns.windowDays).toBe(3)
    expect(STORE_POLICY.cancellation.autoRefundIfPaid).toBe(true)
  })
})
