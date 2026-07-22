import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockCall = vi.fn()

vi.mock('../../config/redisClient.js', () => ({
  isRedisOperational: vi.fn(),
  getRateLimitRedisClient: vi.fn(() => ({ call: mockCall })),
}))

function mockRateLimitConfig(overrides = {}) {
  return {
    isTest: false,
    rateLimit: {
      api: { windowMs: 900_000, max: 200 },
      auth: { windowMs: 900_000, max: 15 },
      chat: { windowMs: 60_000, max: 15 },
      chatDaily: { windowMs: 86_400_000, max: 150 },
      otpConsume: { windowMs: 900_000, max: 10 },
      otpResend: { windowMs: 900_000, max: 5 },
      validateCart: { windowMs: 900_000, max: 30 },
      instanceCount: 1,
      ...overrides,
    },
  }
}

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
      config: mockRateLimitConfig(),
    }))

    const { apiLimiter, authLimiter, chatLimiter, chatUserLimiter, chatUserDailyLimiter, otpConsumeLimiter, otpResendLimiter } =
      await import('../../config/rateLimiters.js')

    expect(getRateLimitRedisClient).toHaveBeenCalled()
    expect(apiLimiter).toBeDefined()
    expect(authLimiter).toBeDefined()
    expect(chatLimiter).toBeDefined()
    expect(chatUserLimiter).toBeDefined()
    expect(chatUserDailyLimiter).toBeDefined()
    expect(otpConsumeLimiter).toBeDefined()
    expect(otpResendLimiter).toBeDefined()
  })

  it('falls back to in-memory stores when Redis is not configured', async () => {
    const { isRedisOperational, getRateLimitRedisClient } = await import(
      '../../config/redisClient.js'
    )
    isRedisOperational.mockReturnValue(false)

    vi.doMock('../../config/env.js', () => ({
      config: mockRateLimitConfig(),
    }))

    const { apiLimiter } = await import('../../config/rateLimiters.js')

    expect(getRateLimitRedisClient).not.toHaveBeenCalled()
    expect(apiLimiter).toBeDefined()
  })

  it('keys per-user chat limits on userAuthId', async () => {
    const { isRedisOperational } = await import('../../config/redisClient.js')
    isRedisOperational.mockReturnValue(false)

    vi.doMock('../../config/env.js', () => ({
      config: mockRateLimitConfig(),
    }))

    const { chatUserRateLimitKey } = await import('../../config/rateLimiters.js')

    expect(chatUserRateLimitKey({ userAuthId: 'abc123', ip: '1.2.3.4' })).toBe('user:abc123')
    expect(() => chatUserRateLimitKey({ ip: '1.2.3.4' })).toThrow(/userAuthId/)
  })

  it('keys guest chat limits on client IP', async () => {
    const { isRedisOperational } = await import('../../config/redisClient.js')
    isRedisOperational.mockReturnValue(false)

    vi.doMock('../../config/env.js', () => ({
      config: mockRateLimitConfig(),
    }))

    const { chatGuestRateLimitKey } = await import('../../config/rateLimiters.js')

    expect(chatGuestRateLimitKey({ ip: '1.2.3.4' })).toBe('guest:1.2.3.4')
    expect(chatGuestRateLimitKey({ socket: { remoteAddress: '::1' } })).toBe('guest:::1')
  })

  it('keys OTP consumption limits on normalized email', async () => {
    const { isRedisOperational } = await import('../../config/redisClient.js')
    isRedisOperational.mockReturnValue(false)

    vi.doMock('../../config/env.js', () => ({
      config: mockRateLimitConfig(),
    }))

    const { otpConsumeRateLimitKey, otpResendRateLimitKey } = await import(
      '../../config/rateLimiters.js'
    )

    expect(
      otpConsumeRateLimitKey({ body: { email: '  User@Example.COM ' }, ip: '9.9.9.9' })
    ).toBe('otp-consume:email:user@example.com')
    expect(otpConsumeRateLimitKey({ body: {}, ip: '9.9.9.9' })).toBe('otp-consume:ip:9.9.9.9')
    expect(
      otpResendRateLimitKey({ body: { email: 'Resend@Test.com' }, ip: '8.8.8.8' })
    ).toBe('otp-resend:email:resend@test.com')
  })

  it('scales down in-memory limits by RATE_LIMIT_INSTANCE_COUNT', async () => {
    const { isRedisOperational } = await import('../../config/redisClient.js')
    isRedisOperational.mockReturnValue(false)

    vi.doMock('../../config/env.js', () => ({
      config: mockRateLimitConfig({ instanceCount: 4 }),
    }))

    const { resolveRateLimitMax } = await import('../../config/rateLimiters.js')
    expect(resolveRateLimitMax(200)).toBe(50)
    expect(resolveRateLimitMax(15)).toBe(3)
  })
})
