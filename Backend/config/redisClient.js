import Redis from 'ioredis'
import { config } from './env.js'

export function isRedisConfigured() {
  return Boolean(config.redis.url)
}

/** BullMQ requires maxRetriesPerRequest: null — use separate connections per role. */
export function createRedisConnection(role = 'default') {
  if (!config.redis.url) {
    throw new Error(`REDIS_URL is not configured (${role})`)
  }

  const connection = new Redis(config.redis.url, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  })

  connection.on('error', (err) => {
    console.error(`[redis:${role}]`, err.message)
  })

  return connection
}

let rateLimitRedis = null

/** Shared ioredis client for express-rate-limit stores (not BullMQ). */
export function getRateLimitRedisClient() {
  if (!config.redis.url) {
    throw new Error('REDIS_URL is not configured (rate-limit)')
  }

  if (!rateLimitRedis) {
    rateLimitRedis = new Redis(config.redis.url, {
      maxRetriesPerRequest: 2,
      enableReadyCheck: true,
    })
    rateLimitRedis.on('error', (err) => {
      console.error('[redis:rate-limit]', err.message)
    })
  }

  return rateLimitRedis
}
