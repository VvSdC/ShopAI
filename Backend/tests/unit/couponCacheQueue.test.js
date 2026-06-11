import { describe, it, expect, vi } from 'vitest'

vi.mock('../../config/redisClient.js', () => ({
  isRedisConfigured: () => false,
  createRedisConnection: vi.fn(),
}))

describe('couponCacheQueue', () => {
  it('is disabled when Redis is not configured', async () => {
    const { isCouponCacheQueueEnabled } = await import('../../services/couponCacheQueue.js')
    expect(isCouponCacheQueueEnabled()).toBe(false)
  })
})
