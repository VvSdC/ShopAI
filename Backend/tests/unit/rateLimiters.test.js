import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockCall = vi.fn()

vi.mock('../../config/redisClient.js', () => ({
  isRedisOperational: vi.fn(),
  getRateLimitRedisClient: vi.fn(() => ({ call: mockCall })),
}))

describe('rateLimiters', () => {
  beforeEach(async () => {
    vi.resetModules()
    mockCall.mockClear()
    const { isRedisOperational, getRateLimitRedisClient } = await import(
      '../../config/redisClient.js'
    )
    isRedisOperational.mockReset()
    getRateLimitRedisClient.mockClear()
  })

  it('wires Redis-backed limiters when REDIS_URL is set', async () => {
    const { isRedisOperational, getRateLimitRedisClient } = await import(
      '../../config/redisClient.js'
    )
    isRedisOperational.mockReturnValue(true)

    vi.doMock('../../config/env.js', () => ({
      config: {
        isTest: false,
        rateLimit: {
          api: { windowMs: 900_000, max: 200 },
          auth: { windowMs: 900_000, max: 15 },
          chat: { windowMs: 60_000, max: 15 },
        },
      },
    }))

    const { apiLimiter, authLimiter, chatLimiter } = await import(
      '../../config/rateLimiters.js'
    )

    expect(getRateLimitRedisClient).toHaveBeenCalled()
    expect(apiLimiter).toBeDefined()
    expect(authLimiter).toBeDefined()
    expect(chatLimiter).toBeDefined()
  })

  it('falls back to in-memory stores when Redis is not configured', async () => {
    const { isRedisOperational, getRateLimitRedisClient } = await import(
      '../../config/redisClient.js'
    )
    isRedisOperational.mockReturnValue(false)

    vi.doMock('../../config/env.js', () => ({
      config: {
        isTest: false,
        rateLimit: {
          api: { windowMs: 900_000, max: 200 },
          auth: { windowMs: 900_000, max: 15 },
          chat: { windowMs: 60_000, max: 15 },
        },
      },
    }))

    const { apiLimiter } = await import('../../config/rateLimiters.js')

    expect(getRateLimitRedisClient).not.toHaveBeenCalled()
    expect(apiLimiter).toBeDefined()
  })
})
