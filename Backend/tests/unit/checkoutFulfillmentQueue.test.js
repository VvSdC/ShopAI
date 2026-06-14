import { describe, it, expect, vi } from 'vitest'

vi.mock('../../config/redisClient.js', () => ({
  isRedisOperational: () => false,
  createRedisConnection: vi.fn(),
}))

describe('checkoutFulfillmentQueue', () => {
  it('is disabled without Redis checkout queue env', async () => {
    const { isCheckoutFulfillmentQueueEnabled } = await import(
      '../../services/checkoutFulfillmentQueue.js'
    )
    expect(isCheckoutFulfillmentQueueEnabled()).toBe(false)
  })
})
