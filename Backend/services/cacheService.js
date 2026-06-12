import logger from '../utils/logger.js'
import {
  getAppRedisClient,
  isAppRedisReady,
  shutdownAppRedisClient,
} from '../config/redisClient.js'

export function isAvailable() {
  return isAppRedisReady()
}

async function ensureClient() {
  return getAppRedisClient()
}

export async function get(key) {
  const redis = await ensureClient()
  if (!redis) return null
  try {
    const raw = await redis.get(key)
    if (raw == null) return null
    return JSON.parse(raw)
  } catch (err) {
    logger.warn(`[cache] get ${key} failed:`, err.message)
    return null
  }
}

export async function set(key, value, ttlSeconds) {
  const redis = await ensureClient()
  if (!redis) return false
  try {
    const payload = JSON.stringify(value)
    if (ttlSeconds > 0) {
      await redis.set(key, payload, 'EX', ttlSeconds)
    } else {
      await redis.set(key, payload)
    }
    return true
  } catch (err) {
    logger.warn(`[cache] set ${key} failed:`, err.message)
    return false
  }
}

export async function del(...keys) {
  const redis = await ensureClient()
  if (!redis || keys.length === 0) return 0
  try {
    return await redis.del(...keys.flat().filter(Boolean))
  } catch (err) {
    logger.warn('[cache] del failed:', err.message)
    return 0
  }
}

export async function delByPrefix(prefix) {
  const redis = await ensureClient()
  if (!redis || !prefix) return 0

  let removed = 0
  try {
    let cursor = '0'
    do {
      const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', `${prefix}*`, 'COUNT', 100)
      cursor = nextCursor
      if (keys.length) {
        removed += await redis.del(...keys)
      }
    } while (cursor !== '0')
  } catch (err) {
    logger.warn(`[cache] delByPrefix ${prefix} failed:`, err.message)
  }
  return removed
}

export async function shutdownCache() {
  await shutdownAppRedisClient()
}
