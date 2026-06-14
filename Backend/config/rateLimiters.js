import rateLimit from 'express-rate-limit'
import { RedisStore } from 'rate-limit-redis'
import { config } from './env.js'
import { getRateLimitRedisClient, isRedisOperational } from './redisClient.js'

function shouldUseRedisStore() {
  return isRedisOperational()
}

function createRedisStore(prefix) {
  if (!shouldUseRedisStore()) return null

  const client = getRateLimitRedisClient()
  return new RedisStore({
    prefix: `rl:${prefix}:`,
    sendCommand: (command, ...args) => {
      if (!isRedisOperational()) {
        throw new Error('Redis unavailable (rate-limit)')
      }
      return client.call(command, ...args)
    },
  })
}

function buildLimiter(prefix, options) {
  const store = createRedisStore(prefix)
  return rateLimit({
    standardHeaders: true,
    legacyHeaders: false,
    passOnStoreError: true,
    ...options,
    ...(store ? { store } : {}),
  })
}

if (shouldUseRedisStore()) {
  console.log('[rate-limit] Using Redis-backed stores (shared counters across processes)')
} else {
  console.log('[rate-limit] Using in-memory stores (set REDIS_URL for multi-process deployments)')
}

export const apiLimiter = buildLimiter('api', {
  windowMs: config.rateLimit.api.windowMs,
  max: config.rateLimit.api.max,
  message: { message: 'Too many requests, please try again later.' },
})

export const authLimiter = buildLimiter('auth', {
  windowMs: config.rateLimit.auth.windowMs,
  max: config.rateLimit.auth.max,
  message: { message: 'Too many login attempts, please try again later.' },
})

export const chatLimiter = buildLimiter('chat', {
  windowMs: config.rateLimit.chat.windowMs,
  max: config.rateLimit.chat.max,
  message: { message: 'Chat rate limit reached. Please wait a moment.' },
})
