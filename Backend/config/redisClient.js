import Redis from 'ioredis'
import { config } from './env.js'
import logger from '../utils/logger.js'

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
    logger.warn(`[redis:${role}]`, err.message)
  })

  return connection
}

let appRedis = null
let appRedisConnectPromise = null
let appRedisReady = false

function createAppRedisClient() {
  if (!config.redis.url) return null

  if (!appRedis) {
    appRedis = new Redis(config.redis.url, {
      maxRetriesPerRequest: 2,
      enableReadyCheck: true,
      lazyConnect: true,
    })
    appRedis.on('ready', () => {
      appRedisReady = true
    })
    appRedis.on('error', (err) => {
      appRedisReady = false
      logger.warn('[redis:app]', err.message)
    })
    appRedis.on('end', () => {
      appRedisReady = false
    })
  }

  return appRedis
}

/** Connect the shared app Redis client once (cache + rate-limit). */
export async function connectAppRedisClient() {
  if (!config.redis.url || config.isTest) return null

  const client = createAppRedisClient()
  if (!client) return null

  if (!appRedisConnectPromise) {
    appRedisConnectPromise = client
      .connect()
      .then(() => {
        appRedisReady = true
        return client
      })
      .catch((err) => {
        logger.warn('[redis:app] connect failed:', err.message)
        appRedisReady = false
        appRedisConnectPromise = null
        return null
      })
  }

  return appRedisConnectPromise
}

export function isAppRedisReady() {
  return Boolean(appRedis && appRedisReady && !config.isTest)
}

/** Shared Redis for JSON cache (catalogCache → cacheService) and rate-limit stores. Not BullMQ. */
export async function getAppRedisClient() {
  if (!config.redis.url || config.isTest) return null
  await connectAppRedisClient()
  return appRedisReady ? appRedis : null
}

/** Synchronous handle for express-rate-limit (connect starts in background). */
export function getRateLimitRedisClient() {
  if (!config.redis.url) {
    throw new Error('REDIS_URL is not configured (rate-limit)')
  }

  const client = createAppRedisClient()
  if (!config.isTest && !appRedisConnectPromise) {
    connectAppRedisClient().catch(() => {})
  }
  return client
}

export async function shutdownAppRedisClient() {
  appRedisConnectPromise = null
  appRedisReady = false
  if (appRedis) {
    try {
      await appRedis.quit()
    } catch {
      // ignore
    }
    appRedis = null
  }
}
