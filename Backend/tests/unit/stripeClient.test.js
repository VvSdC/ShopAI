import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('stripeClient', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('throws a clear error when STRIPE_KEY is missing', async () => {
    vi.doMock('../../config/env.js', () => ({
      config: { stripe: { secretKey: '' } },
    }))

    const { getStripeClient } = await import('../../config/stripeClient.js')
    expect(() => getStripeClient()).toThrow('STRIPE_KEY is not configured')
  })

  it('returns a lazy singleton when configured', async () => {
    vi.doMock('../../config/env.js', () => ({
      config: { stripe: { secretKey: 'sk_test_example' } },
    }))

    const { getStripeClient } = await import('../../config/stripeClient.js')
    const a = getStripeClient()
    const b = getStripeClient()
    expect(a).toBe(b)
  })
})
