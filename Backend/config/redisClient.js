import Redis from 'ioredis'
import { config } from './env.js'
import logger from '../utils/logger.js'

let redisDisabled = false
let disableReason = null
let disableInFlight = null

/** REDIS_URL is present (may still be degraded at runtime). */
export function isRedisConfigured() {
  return Boolean(config.redis.url)
}

/** Redis is configured and healthy enough for cache, rate limits, and BullMQ. */
export function isRedisOperational() {
  return isRedisConfigured() && !redisDisabled && !config.isTest
}

export function isRedisDegraded() {
  return redisDisabled
}

export function getRedisDisableReason() {
  return disableReason
}

export function isRedisFatalError(err) {
  const message = String(err?.message || err || '')
  return (
    message.includes('max requests limit exceeded') ||
    message.includes('READONLY') ||
    message.includes('ECONNREFUSED') ||
    message.includes('ETIMEDOUT') ||
    message.includes('ENOTFOUND') ||
    message.includes('OOM')
  )
}

function handleRedisConnectionError(err, role) {
  const message = String(err?.message || err)
  logger.warn(`[redis:${role}]`, message)
  if (isRedisFatalError(err)) {
    void disableRedis(message)
  }
}

/** Stop using Redis for this process; cache/rate-limit fall back; BullMQ workers stop. */
export async function disableRedis(reason) {
  if (redisDisabled) return disableInFlight
  redisDisabled = true
  disableReason = reason
  appRedisReady = false
  logger.warn(
    `[redis] Degraded — ${reason}. Cache and rate limits use in-memory fallbacks; BullMQ disabled.`
  )

  if (!disableInFlight) {
    disableInFlight = (async () => {
      try {
        const { stopAllQueueWorkers } = await import('../services/queueWorkers.js')
        await stopAllQueueWorkers()
      } catch (err) {
        logger.warn('[redis] stop workers failed:', err.message)
      }
      await shutdownAppRedisClient()
    })()
  }

  return disableInFlight
}

/** Ping Redis once at startup; degrade early if unavailable or over quota. */
export async function probeRedisHealth() {
  if (!isRedisConfigured() || config.isTest) return false

  const probe = new Redis(config.redis.url, {
    maxRetriesPerRequest: 1,
    enableReadyCheck: true,
    connectTimeout: 8000,
    lazyConnect: true,
  })

  probe.on('error', () => {})

  try {
    await probe.connect()
    const pong = await probe.ping()
    await probe.quit()
    return pong === 'PONG'
  } catch (err) {
    try {
      await probe.quit()
    } catch {
      // ignore
    }
    await disableRedis(`startup probe failed: ${err.message}`)
    return false
  }
}

export function attachBullMqWorkerErrorHandler(worker, label) {
  worker.on('error', (err) => {
    const message = String(err?.message || err)
    logger.error(`[${label}] worker error:`, message)
    if (isRedisFatalError(err)) {
      void disableRedis(message)
    }
  })
}

/** BullMQ requires maxRetriesPerRequest: null — use separate connections per role. */
export function createRedisConnection(role = 'default') {
  if (!isRedisOperational()) {
    throw new Error(`Redis unavailable (${role})`)
  }

  const connection = new Redis(config.redis.url, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  })

  connection.on('error', (err) => {
    handleRedisConnectionError(err, role)
  })

  return connection
}

let appRedis = null
let appRedisConnectPromise = null
let appRedisReady = false

function createAppRedisClient() {
  if (!isRedisOperational()) return null

  if (!appRedis) {
    appRedis = new Redis(config.redis.url, {
      maxRetriesPerRequest: 2,
      enableReadyCheck: true,
      lazyConnect: true,
    })
    appRedis.on('ready', () => {
      if (!redisDisabled) appRedisReady = true
    })
    appRedis.on('error', (err) => {
      appRedisReady = false
      handleRedisConnectionError(err, 'app')
    })
    appRedis.on('end', () => {
      appRedisReady = false
    })
  }

  return appRedis
}

/** Connect the shared app Redis client once (cache + rate-limit). */
export async function connectAppRedisClient() {
  if (!isRedisOperational()) return null

  const client = createAppRedisClient()
  if (!client) return null

  if (!appRedisConnectPromise) {
    appRedisConnectPromise = client
      .connect()
      .then(() => {
        if (!redisDisabled) appRedisReady = true
        return client
      })
      .catch(async (err) => {
        logger.warn('[redis:app] connect failed:', err.message)
        appRedisReady = false
        appRedisConnectPromise = null
        if (isRedisFatalError(err)) {
          await disableRedis(err.message)
        }
        return null
      })
  }

  return appRedisConnectPromise
}

export function isAppRedisReady() {
  return Boolean(appRedis && appRedisReady && isRedisOperational())
}

/** Shared Redis for JSON cache (catalogCache → cacheService) and rate-limit stores. Not BullMQ. */
export async function getAppRedisClient() {
  if (!isRedisOperational()) return null
  await connectAppRedisClient()
  return appRedisReady ? appRedis : null
}

/** Synchronous handle for express-rate-limit (connect starts in background). */
export function getRateLimitRedisClient() {
  if (!isRedisOperational()) {
    throw new Error('Redis is not operational (rate-limit)')
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

/** Test-only reset */
export function resetRedisDegradedStateForTests() {
  redisDisabled = false
  disableReason = null
  disableInFlight = null
  appRedisConnectPromise = null
  appRedisReady = false
  appRedis = null
}
