import logger from '../utils/logger.js'
import { AppError } from '../utils/appError.js'
import { getAppRedisClient, isAppRedisReady } from '../config/redisClient.js'
import { normalizeCartIdempotencyKey } from './cartIdempotency.js'

export const ORDER_IDEMPOTENCY_TTL_SECONDS = 24 * 60 * 60
const ORDER_IDEMPOTENCY_LOCK_SECONDS = 60

const memoryResults = new Map()
const memoryLocks = new Map()

function redisResultKey(scopedKey) {
  return `order:idempotency:result:${scopedKey}`
}

function redisLockKey(scopedKey) {
  return `order:idempotency:lock:${scopedKey}`
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
    expiresAt: Date.now() + ORDER_IDEMPOTENCY_TTL_SECONDS * 1000,
  })
}

function claimMemoryLock(scopedKey) {
  const now = Date.now()
  const existing = memoryLocks.get(scopedKey)
  if (existing && existing > now) return false
  memoryLocks.set(scopedKey, now + ORDER_IDEMPOTENCY_LOCK_SECONDS * 1000)
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
        logger.warn('[orderIdempotency] Redis get failed:', err.message)
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
          ORDER_IDEMPOTENCY_TTL_SECONDS
        )
        return
      } catch (err) {
        logger.warn('[orderIdempotency] Redis set failed:', err.message)
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
          ORDER_IDEMPOTENCY_LOCK_SECONDS,
          'NX'
        )
        if (result === 'OK') return true
        if (result === null) return false
      } catch (err) {
        logger.warn('[orderIdempotency] Redis lock failed:', err.message)
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
        logger.warn('[orderIdempotency] Redis unlock failed:', err.message)
      }
    }
  }
  releaseMemoryLock(scopedKey)
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function waitForStoredResult(scopedKey, { attempts = 30, delayMs = 50 } = {}) {
  for (let i = 0; i < attempts; i += 1) {
    const cached = await getStoredResult(scopedKey)
    if (cached) return cached
    await sleep(delayMs)
  }
  return null
}

export async function runWithOrderIdempotency({ userId, idempotencyKey, run }) {
  const key = normalizeCartIdempotencyKey(idempotencyKey)
  if (!key) return run()

  const scopedKey = scopeKey(userId, key)
  const cached = await getStoredResult(scopedKey)
  if (cached) return cached

  const claimed = await claimLock(scopedKey)
  if (!claimed) {
    const replay = await waitForStoredResult(scopedKey)
    if (replay) return replay
    throw new AppError('Duplicate checkout request is still processing', 409)
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

export function resetOrderIdempotencyForTests() {
  memoryResults.clear()
  memoryLocks.clear()
}
