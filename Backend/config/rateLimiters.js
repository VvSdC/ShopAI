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

/** Account id for chat cost controls (call only after isLoggedIn). */
export function chatUserRateLimitKey(req) {
  if (!req.userAuthId) {
    throw new Error('chatUserRateLimitKey requires req.userAuthId')
  }
  return `user:${req.userAuthId}`
}

/** IP-based key for guest chat (no account). */
export function chatGuestRateLimitKey(req) {
  const ip = req.ip || req.socket?.remoteAddress || 'unknown'
  return `guest:${ip}`
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

/** Per-account chat cap (requires isLoggedIn before this runs). */
export const chatUserLimiter = buildLimiter('chat-user', {
  windowMs: config.rateLimit.chat.windowMs,
  max: config.rateLimit.chat.max,
  keyGenerator: chatUserRateLimitKey,
  validate: { keyGeneratorIpFallback: false },
  message: { message: 'Chat rate limit reached. Please wait a moment.' },
})

/** Daily per-account ceiling on LLM-backed chat messages. */
export const chatUserDailyLimiter = buildLimiter('chat-user-daily', {
  windowMs: config.rateLimit.chatDaily.windowMs,
  max: config.rateLimit.chatDaily.max,
  keyGenerator: chatUserRateLimitKey,
  validate: { keyGeneratorIpFallback: false },
  message: {
    message: 'Daily chat limit reached. Please try again tomorrow or contact support.',
  },
})

/** Per-IP guest chat cap (no isLoggedIn). */
export const chatGuestLimiter = buildLimiter('chat-guest', {
  windowMs: config.rateLimit.chat.windowMs,
  max: config.rateLimit.chat.max,
  keyGenerator: chatGuestRateLimitKey,
  validate: { keyGeneratorIpFallback: false },
  message: { message: 'Chat rate limit reached. Please wait a moment.' },
})

/** Daily per-IP ceiling for guest chat. */
export const chatGuestDailyLimiter = buildLimiter('chat-guest-daily', {
  windowMs: config.rateLimit.chatDaily.windowMs,
  max: config.rateLimit.chatDaily.max,
  keyGenerator: chatGuestRateLimitKey,
  validate: { keyGeneratorIpFallback: false },
  message: {
    message: 'Daily chat limit reached. Please try again tomorrow or sign in for a higher limit.',
  },
})
