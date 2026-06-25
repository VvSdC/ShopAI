import { describe, it, expect, vi, beforeEach } from 'vitest'
import StripeWebhookEvent from '../../model/StripeWebhookEvent.js'

const mockRedisSet = vi.fn()
const mockRedisDel = vi.fn()

vi.mock('../../config/redisClient.js', () => ({
  isAppRedisReady: vi.fn(() => false),
  getAppRedisClient: vi.fn(async () => ({
    set: (...args) => mockRedisSet(...args),
    del: (...args) => mockRedisDel(...args),
  })),
}))

describe('stripeWebhookIdempotency', () => {
  beforeEach(async () => {
    mockRedisSet.mockReset()
    mockRedisDel.mockReset()
    await StripeWebhookEvent.deleteMany({})
    const { isAppRedisReady } = await import('../../config/redisClient.js')
    isAppRedisReady.mockReturnValue(false)
  })

  it('claims a Stripe event once in Mongo', async () => {
    const { claimStripeWebhookEvent } = await import('../../services/stripeWebhookIdempotency.js')

    const payload = {
      stripeEventId: 'evt_test_claim_once',
      eventType: 'checkout.session.completed',
      orderId: '507f1f77bcf86cd799439011',
    }

    const first = await claimStripeWebhookEvent(payload)
    const second = await claimStripeWebhookEvent(payload)

    expect(first).toEqual({ claimed: true, backend: 'mongo' })
    expect(second).toEqual({ claimed: false, backend: 'mongo' })
    expect(await StripeWebhookEvent.countDocuments({ stripeEventId: payload.stripeEventId })).toBe(1)
  })

  it('releases a Mongo claim so Stripe retries can be processed', async () => {
    const { claimStripeWebhookEvent, releaseStripeWebhookEvent } = await import(
      '../../services/stripeWebhookIdempotency.js'
    )

    const eventId = 'evt_test_release_mongo'
    await claimStripeWebhookEvent({
      stripeEventId: eventId,
      eventType: 'checkout.session.completed',
    })

    await releaseStripeWebhookEvent(eventId, 'mongo')

    const retry = await claimStripeWebhookEvent({
      stripeEventId: eventId,
      eventType: 'checkout.session.completed',
    })
    expect(retry).toEqual({ claimed: true, backend: 'mongo' })
  })

  it('uses Redis SET NX when Redis is ready', async () => {
    const { isAppRedisReady } = await import('../../config/redisClient.js')
    isAppRedisReady.mockReturnValue(true)
    mockRedisSet.mockResolvedValueOnce('OK').mockResolvedValueOnce(null)

    const { claimStripeWebhookEvent } = await import('../../services/stripeWebhookIdempotency.js')

    const payload = {
      stripeEventId: 'evt_test_redis',
      eventType: 'checkout.session.completed',
    }

    const first = await claimStripeWebhookEvent(payload)
    const second = await claimStripeWebhookEvent(payload)

    expect(first).toEqual({ claimed: true, backend: 'redis' })
    expect(second).toEqual({ claimed: false, backend: 'redis' })
    expect(mockRedisSet).toHaveBeenCalledTimes(2)
    expect(mockRedisSet.mock.calls[0][0]).toBe('stripe:webhook:event:evt_test_redis')
    expect(mockRedisSet.mock.calls[0].slice(1)).toEqual(['1', 'EX', 73 * 60 * 60, 'NX'])
    expect(await StripeWebhookEvent.countDocuments({ stripeEventId: payload.stripeEventId })).toBe(0)
  })

  it('releases a Redis claim on processing failure', async () => {
    const { isAppRedisReady } = await import('../../config/redisClient.js')
    isAppRedisReady.mockReturnValue(true)
    mockRedisSet.mockResolvedValue('OK')

    const { claimStripeWebhookEvent, releaseStripeWebhookEvent } = await import(
      '../../services/stripeWebhookIdempotency.js'
    )

    const eventId = 'evt_test_release_redis'
    await claimStripeWebhookEvent({
      stripeEventId: eventId,
      eventType: 'checkout.session.completed',
    })

    await releaseStripeWebhookEvent(eventId, 'redis')
    expect(mockRedisDel).toHaveBeenCalledWith('stripe:webhook:event:evt_test_release_redis')
  })
})
