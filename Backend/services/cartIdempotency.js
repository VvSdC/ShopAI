import logger from '../utils/logger.js'
import { AppError } from '../utils/appError.js'
import { getAppRedisClient, isAppRedisReady } from '../config/redisClient.js'

export const CART_IDEMPOTENCY_TTL_SECONDS = 24 * 60 * 60
const CART_IDEMPOTENCY_LOCK_SECONDS = 30
const MAX_IDEMPOTENCY_KEY_LENGTH = 128

const memoryResults = new Map()
const memoryLocks = new Map()

function redisResultKey(scopedKey) {
  return `cart:idempotency:result:${scopedKey}`
}

function redisLockKey(scopedKey) {
  return `cart:idempotency:lock:${scopedKey}`
}

export function normalizeCartIdempotencyKey(value) {
  const key = String(value || '').trim()
  if (!key) return null
  if (key.length > MAX_IDEMPOTENCY_KEY_LENGTH) {
    throw new AppError('Idempotency-Key is too long', 400)
  }
  if (!/^[A-Za-z0-9_-]+$/.test(key)) {
    throw new AppError('Idempotency-Key has invalid characters', 400)
  }
  return key
}

function scopeKey(userId, idempotencyKey) {
  return `${String(userId)}:${idempotencyKey}`
}

function getMemoryResult(scopedKey) {
  const entry = memoryResults.get(scopedKey)
  if (!entry) return null
  if (entry.expiresAt <= Date.now()) {
    memoryResults.delete(scopedKey)
    return null
  }
  return entry.payload
}

function setMemoryResult(scopedKey, payload) {
  memoryResults.set(scopedKey, {
    payload,
    expiresAt: Date.now() + CART_IDEMPOTENCY_TTL_SECONDS * 1000,
  })
}

function claimMemoryLock(scopedKey) {
  const now = Date.now()
  const existing = memoryLocks.get(scopedKey)
  if (existing && existing > now) return false
  memoryLocks.set(scopedKey, now + CART_IDEMPOTENCY_LOCK_SECONDS * 1000)
  return true
}

function releaseMemoryLock(scopedKey) {
  memoryLocks.delete(scopedKey)
}

async function getStoredResult(scopedKey) {
  if (isAppRedisReady()) {
    const redis = await getAppRedisClient()
    if (redis) {
      try {
        const raw = await redis.get(redisResultKey(scopedKey))
        if (raw) return JSON.parse(raw)
      } catch (err) {
        logger.warn('[cartIdempotency] Redis get failed:', err.message)
      }
    }
  }
  return getMemoryResult(scopedKey)
}

async function storeResult(scopedKey, payload) {
  if (isAppRedisReady()) {
    const redis = await getAppRedisClient()
    if (redis) {
      try {
        await redis.set(
          redisResultKey(scopedKey),
          JSON.stringify(payload),
          'EX',
          CART_IDEMPOTENCY_TTL_SECONDS
        )
        return
      } catch (err) {
        logger.warn('[cartIdempotency] Redis set failed:', err.message)
      }
    }
  }
  setMemoryResult(scopedKey, payload)
}

async function claimLock(scopedKey) {
  if (isAppRedisReady()) {
    const redis = await getAppRedisClient()
    if (redis) {
      try {
        const result = await redis.set(
          redisLockKey(scopedKey),
          '1',
          'EX',
          CART_IDEMPOTENCY_LOCK_SECONDS,
          'NX'
        )
        if (result === 'OK') return true
        if (result === null) return false
      } catch (err) {
        logger.warn('[cartIdempotency] Redis lock failed:', err.message)
      }
    }
  }
  return claimMemoryLock(scopedKey)
}

async function releaseLock(scopedKey) {
  if (isAppRedisReady()) {
    const redis = await getAppRedisClient()
    if (redis) {
      try {
        await redis.del(redisLockKey(scopedKey))
      } catch (err) {
        logger.warn('[cartIdempotency] Redis unlock failed:', err.message)
      }
    }
  }
  releaseMemoryLock(scopedKey)
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function waitForStoredResult(scopedKey, { attempts = 25, delayMs = 40 } = {}) {
  for (let i = 0; i < attempts; i += 1) {
    const cached = await getStoredResult(scopedKey)
    if (cached) return cached
    await sleep(delayMs)
  }
  return null
}

/**
 * Run a cart mutation once per (user, Idempotency-Key). Without a key, runs normally.
 * Replays return the stored JSON body; failed attempts release the lock for retry.
 */
export async function runWithCartIdempotency({ userId, idempotencyKey, run }) {
  const key = normalizeCartIdempotencyKey(idempotencyKey)
  if (!key) return run()

  const scopedKey = scopeKey(userId, key)
  const cached = await getStoredResult(scopedKey)
  if (cached) return cached

  const claimed = await claimLock(scopedKey)
  if (!claimed) {
    const replay = await waitForStoredResult(scopedKey)
    if (replay) return replay
    throw new AppError('Duplicate cart request is still processing', 409)
  }

  try {
    const result = await run()
    await storeResult(scopedKey, result)
    return result
  } catch (err) {
    await releaseLock(scopedKey)
    throw err
  }
}

export function resetCartIdempotencyForTests() {
  memoryResults.clear()
  memoryLocks.clear()
}
