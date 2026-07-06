import rateLimit from 'express-rate-limit'
import { RedisStore } from 'rate-limit-redis'
import { config } from './env.js'
import { getRateLimitRedisClient, isRedisOperational } from './redisClient.js'
import { normalizeEmail } from '../utils/normalizeEmail.js'
import logger from '../utils/logger.js'

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

function clientIp(req) {
  return req.ip || req.socket?.remoteAddress || 'unknown'
}

/** Per-email key for OTP verify/reset; falls back to IP when email is missing. */
export function otpConsumeRateLimitKey(req) {
  const email = normalizeEmail(req.body?.email)
  if (email) {
    return `otp-consume:email:${email}`
  }
  return `otp-consume:ip:${clientIp(req)}`
}

/** Per-email key for OTP issuance; falls back to IP when email is missing. */
export function otpResendRateLimitKey(req) {
  const email = normalizeEmail(req.body?.email)
  if (email) {
    return `otp-resend:email:${email}`
  }
  return `otp-resend:ip:${clientIp(req)}`
}

/** Per-IP key for public guest cart validation (stock/pricing probe). */
export function validateCartRateLimitKey(req) {
  return `validate-cart:ip:${clientIp(req)}`
}

if (shouldUseRedisStore()) {
  logger.log('[rate-limit] Using Redis-backed stores (shared counters across processes)')
} else {
  logger.log('[rate-limit] Using in-memory stores (set REDIS_URL for multi-process deployments)')
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

/** Limits wrong OTP guesses per email (verify-otp, reset-password, verify-email). */
export const otpConsumeLimiter = buildLimiter('otp-consume', {
  windowMs: config.rateLimit.otpConsume.windowMs,
  max: config.rateLimit.otpConsume.max,
  keyGenerator: otpConsumeRateLimitKey,
  validate: { keyGeneratorIpFallback: false },
  message: {
    message: 'Too many OTP attempts for this email. Please try again in 15 minutes.',
  },
})

/** Limits how often new OTPs can be requested (forgot-password, resend-verification). */
export const otpResendLimiter = buildLimiter('otp-resend', {
  windowMs: config.rateLimit.otpResend.windowMs,
  max: config.rateLimit.otpResend.max,
  keyGenerator: otpResendRateLimitKey,
  validate: { keyGeneratorIpFallback: false },
  message: {
    message: 'Too many OTP requests for this email. Please try again later.',
  },
})

/** Per-IP cap on unauthenticated POST /products/validate-cart (stock scraping). */
export const validateCartLimiter = buildLimiter('validate-cart', {
  windowMs: config.rateLimit.validateCart.windowMs,
  max: config.rateLimit.validateCart.max,
  keyGenerator: validateCartRateLimitKey,
  validate: { keyGeneratorIpFallback: false },
  message: {
    message: 'Too many cart validation requests. Please try again later.',
  },
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
