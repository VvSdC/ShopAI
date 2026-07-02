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
          chatDaily: { windowMs: 86_400_000, max: 150 },
        },
      },
    }))

    const { apiLimiter, authLimiter, chatLimiter, chatUserLimiter, chatUserDailyLimiter } =
      await import('../../config/rateLimiters.js')

    expect(getRateLimitRedisClient).toHaveBeenCalled()
    expect(apiLimiter).toBeDefined()
    expect(authLimiter).toBeDefined()
    expect(chatLimiter).toBeDefined()
    expect(chatUserLimiter).toBeDefined()
    expect(chatUserDailyLimiter).toBeDefined()
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
          chatDaily: { windowMs: 86_400_000, max: 150 },
        },
      },
    }))

    const { apiLimiter } = await import('../../config/rateLimiters.js')

    expect(getRateLimitRedisClient).not.toHaveBeenCalled()
    expect(apiLimiter).toBeDefined()
  })

  it('keys per-user chat limits on userAuthId', async () => {
    const { isRedisOperational } = await import('../../config/redisClient.js')
    isRedisOperational.mockReturnValue(false)

    vi.doMock('../../config/env.js', () => ({
      config: {
        isTest: false,
        rateLimit: {
          api: { windowMs: 900_000, max: 200 },
          auth: { windowMs: 900_000, max: 15 },
          chat: { windowMs: 60_000, max: 15 },
          chatDaily: { windowMs: 86_400_000, max: 150 },
        },
      },
    }))

    const { chatUserRateLimitKey } = await import('../../config/rateLimiters.js')

    expect(chatUserRateLimitKey({ userAuthId: 'abc123', ip: '1.2.3.4' })).toBe('user:abc123')
    expect(() => chatUserRateLimitKey({ ip: '1.2.3.4' })).toThrow(/userAuthId/)
  })

  it('keys guest chat limits on client IP', async () => {
    const { isRedisOperational } = await import('../../config/redisClient.js')
    isRedisOperational.mockReturnValue(false)

    vi.doMock('../../config/env.js', () => ({
      config: {
        isTest: false,
        rateLimit: {
          api: { windowMs: 900_000, max: 200 },
          auth: { windowMs: 900_000, max: 15 },
          chat: { windowMs: 60_000, max: 15 },
          chatDaily: { windowMs: 86_400_000, max: 150 },
        },
      },
    }))

    const { chatGuestRateLimitKey } = await import('../../config/rateLimiters.js')

    expect(chatGuestRateLimitKey({ ip: '1.2.3.4' })).toBe('guest:1.2.3.4')
    expect(chatGuestRateLimitKey({ socket: { remoteAddress: '::1' } })).toBe('guest:::1')
  })
})
