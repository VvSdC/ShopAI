import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockCall = vi.fn()

vi.mock('../../config/redisClient.js', () => ({
  isRedisConfigured: vi.fn(),
  getRateLimitRedisClient: vi.fn(() => ({ call: mockCall })),
}))

describe('rateLimiters', () => {
  beforeEach(() => {
    vi.resetModules()
    mockCall.mockClear()
  })

  it('wires Redis-backed limiters when REDIS_URL is set', async () => {
    const { isRedisConfigured, getRateLimitRedisClient } = await import(
      '../../config/redisClient.js'
    )
    isRedisConfigured.mockReturnValue(true)

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
    const { isRedisConfigured, getRateLimitRedisClient } = await import(
      '../../config/redisClient.js'
    )
    isRedisConfigured.mockReturnValue(false)

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
