import logger from '../utils/logger.js'
import { getAppRedisClient, isAppRedisReady } from '../config/redisClient.js'
import StripeWebhookEvent, {
  STRIPE_WEBHOOK_EVENT_TTL_SECONDS,
} from '../model/StripeWebhookEvent.js'

const REDIS_KEY_PREFIX = 'stripe:webhook:event:'

function redisKey(stripeEventId) {
  return `${REDIS_KEY_PREFIX}${String(stripeEventId || '').trim()}`
}

async function claimInRedis(stripeEventId) {
  const redis = await getAppRedisClient()
  if (!redis) return null

  try {
    const result = await redis.set(
      redisKey(stripeEventId),
      '1',
      'EX',
      STRIPE_WEBHOOK_EVENT_TTL_SECONDS,
      'NX'
    )
    return result === 'OK'
  } catch (err) {
    logger.warn('[stripeWebhookIdempotency] Redis claim failed:', err.message)
    return null
  }
}

async function releaseInRedis(stripeEventId) {
  const redis = await getAppRedisClient()
  if (!redis) return

  try {
    await redis.del(redisKey(stripeEventId))
  } catch (err) {
    logger.warn('[stripeWebhookIdempotency] Redis release failed:', err.message)
  }
}

async function claimInMongo({ stripeEventId, eventType, orderId }) {
  try {
    await StripeWebhookEvent.create({
      stripeEventId,
      eventType,
      orderId: orderId ? String(orderId) : null,
    })
    return true
  } catch (err) {
    if (err?.code === 11000) return false
    throw err
  }
}

async function releaseInMongo(stripeEventId) {
  try {
    await StripeWebhookEvent.deleteOne({ stripeEventId: String(stripeEventId) })
  } catch (err) {
    logger.warn('[stripeWebhookIdempotency] Mongo release failed:', err.message)
  }
}

/**
 * Atomically claim a Stripe webhook event before fulfillment side effects.
 * Returns { claimed: true } on first delivery, { claimed: false } on duplicates.
 */
export async function claimStripeWebhookEvent({
  stripeEventId,
  eventType,
  orderId = null,
}) {
  const eventId = String(stripeEventId || '').trim()
  if (!eventId) {
    throw new Error('stripeEventId is required')
  }

  if (isAppRedisReady()) {
    const redisClaimed = await claimInRedis(eventId)
    if (redisClaimed === true) {
      return { claimed: true, backend: 'redis' }
    }
    if (redisClaimed === false) {
      return { claimed: false, backend: 'redis' }
    }
  }

  const mongoClaimed = await claimInMongo({ stripeEventId: eventId, eventType, orderId })
  return { claimed: mongoClaimed, backend: 'mongo' }
}

/** Allow Stripe to retry after a failed processing attempt. */
export async function releaseStripeWebhookEvent(stripeEventId, backend = null) {
  const eventId = String(stripeEventId || '').trim()
  if (!eventId) return

  if (backend === 'redis' || (backend == null && isAppRedisReady())) {
    await releaseInRedis(eventId)
  }
  if (backend === 'mongo' || backend == null) {
    await releaseInMongo(eventId)
  }
}
