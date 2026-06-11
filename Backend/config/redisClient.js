import Redis from 'ioredis'
import { config } from './env.js'

export function isRedisConfigured() {
  return Boolean(config.redis.url)
}

/** BullMQ requires maxRetriesPerRequest: null on ioredis connections. */
export function createRedisConnection(label = 'default') {
  if (!config.redis.url) {
    throw new Error(`REDIS_URL is not configured (${label})`)
  }

  const connection = new Redis(config.redis.url, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  })

  connection.on('error', (err) => {
    console.error(`[redis:${label}]`, err.message)
  })

  return connection
}
