import { describe, it, expect, vi } from 'vitest'

vi.mock('../../config/redisClient.js', () => ({
  isRedisOperational: () => false,
  createRedisConnection: vi.fn(),
}))

describe('moderationQueue', () => {
  it('is disabled when Redis is not configured', async () => {
    const { isModerationQueueEnabled } = await import('../../services/moderationQueue.js')
    expect(isModerationQueueEnabled()).toBe(false)
  })
})

describe('productTaggingQueue', () => {
  it('is disabled when Redis is not configured', async () => {
    const { isProductTaggingQueueEnabled } = await import('../../services/productTaggingQueue.js')
    expect(isProductTaggingQueueEnabled()).toBe(false)
  })
})
