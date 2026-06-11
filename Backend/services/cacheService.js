import Redis from 'ioredis'
import { config } from '../config/env.js'

let client = null
let connectAttempted = false
let redisReady = false

async function ensureClient() {
  if (!config.redis.url || config.isTest) return null

  if (!client) {
    client = new Redis(config.redis.url, {
      maxRetriesPerRequest: 2,
      enableReadyCheck: true,
      lazyConnect: true,
    })
    client.on('ready', () => {
      redisReady = true
    })
    client.on('error', (err) => {
      redisReady = false
      console.warn('[cache] Redis error:', err.message)
    })
    client.on('end', () => {
      redisReady = false
    })
  }

  if (!connectAttempted) {
    connectAttempted = true
    try {
      await client.connect()
      redisReady = true
    } catch (err) {
      console.warn('[cache] Redis unavailable, falling back to Mongo:', err.message)
      redisReady = false
      return null
    }
  }

  return redisReady ? client : null
}

export function isAvailable() {
  return Boolean(config.redis.url) && redisReady && !config.isTest
}

export async function get(key) {
  const redis = await ensureClient()
  if (!redis) return null
  try {
    const raw = await redis.get(key)
    if (raw == null) return null
    return JSON.parse(raw)
  } catch (err) {
    console.warn(`[cache] get ${key} failed:`, err.message)
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
    console.warn(`[cache] set ${key} failed:`, err.message)
    return false
  }
}

export async function del(...keys) {
  const redis = await ensureClient()
  if (!redis || keys.length === 0) return 0
  try {
    return await redis.del(...keys.flat().filter(Boolean))
  } catch (err) {
    console.warn('[cache] del failed:', err.message)
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
    console.warn(`[cache] delByPrefix ${prefix} failed:`, err.message)
  }
  return removed
}

export async function shutdownCache() {
  if (client) {
    try {
      await client.quit()
    } catch {
      // ignore
    }
    client = null
    connectAttempted = false
    redisReady = false
  }
}
