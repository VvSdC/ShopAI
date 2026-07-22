import logger from '../utils/logger.js'
import { Queue, Worker } from 'bullmq'
import Order from '../model/Order.js'
import { config } from '../config/env.js'
import { getStripeClient, hasStripeConfigured } from '../config/stripeClient.js'
import { createRedisConnection, isRedisOperational, attachBullMqWorkerErrorHandler } from '../config/redisClient.js'
import { safeTeardownBullMq } from './bullMqTeardown.js'
import { releaseStock } from './stockService.js'
import { isPaidPaymentStatus } from '../utils/paymentStatus.js'
import {
  attachQueueFailureHandlers,
  DEFAULT_QUEUE_JOB_OPTIONS,
} from './queueFailureHandler.js'

const QUEUE_NAME = 'checkout-expiry'
const JOB_NAME = 'expire-checkout'
const IN_PROCESS_SWEEP_INTERVAL_MS = 60_000
const IN_PROCESS_SWEEP_STARTUP_DELAY_MS = 10_000

const inProcessExpiryTimers = new Map()
let inProcessSweepInterval = null
let inProcessSweepStartupTimer = null

async function releaseCheckoutStockHold(orderId) {
  const claimed = await Order.findOneAndUpdate(
    {
      _id: orderId,
      stockReservedAtCheckout: true,
      stockReservationReleasedAt: null,
      stockReservationSettledAt: null,
      paymentStatus: { $ne: 'paid' },
    },
    { stockReservationReleasedAt: new Date() },
    { new: true }
  )

  if (!claimed) return false

  for (const item of claimed.orderItems || []) {
    if (!item?._id) continue
    await releaseStock(item._id, item.qty)
  }
  return true
}

/**
 * Expire a pending Stripe checkout session and align MongoDB checkoutExpiresAt.
 * Safe to call from the BullMQ worker, poll path, or manual expire endpoint.
 */
export async function expireCheckoutJob(orderId) {
  const order = await Order.findById(orderId)
  if (!order) {
    return { ok: false, reason: 'not_found' }
  }

  if (isPaidPaymentStatus(order.paymentStatus)) {
    return { ok: true, skipped: true, reason: 'already_paid' }
  }

  const stripe = hasStripeConfigured() ? getStripeClient() : null
  if (order.stripeSessionId && stripe) {
    try {
      const session = await stripe.checkout.sessions.retrieve(order.stripeSessionId)
      if (session.payment_status === 'paid' || session.status === 'complete') {
        return { ok: true, skipped: true, reason: 'stripe_already_paid' }
      }
      if (session.status !== 'expired') {
        await stripe.checkout.sessions.expire(order.stripeSessionId)
      }
    } catch (err) {
      logger.warn(`[checkoutQueue] Stripe expire failed for ${orderId}:`, err.message)
    }
  }

  const now = new Date()
  try {
    await releaseCheckoutStockHold(orderId)
  } catch (err) {
    logger.error(`[checkoutQueue] stock hold release failed for ${orderId}:`, err.message)
  }

  const refreshed = await Order.findById(orderId)
  if (!refreshed) {
    return { ok: false, reason: 'not_found' }
  }
  if (!refreshed.checkoutExpiresAt || refreshed.checkoutExpiresAt > now) {
    refreshed.checkoutExpiresAt = now
    await refreshed.save()
  }

  return { ok: true, expired: true }
}

let queue = null
let worker = null
let queueConnection = null
let workerConnection = null

export function isCheckoutQueueEnabled() {
  return isRedisOperational() && config.redis.checkoutQueueEnabled
}

function getCheckoutQueue() {
  if (!isCheckoutQueueEnabled()) return null
  if (!queue) {
    queueConnection = createRedisConnection('queue')
    queue = new Queue(QUEUE_NAME, { connection: queueConnection })
  }
  return queue
}

function scheduleInProcessCheckoutExpiry(orderId, delayMs) {
  const key = String(orderId)
  const existing = inProcessExpiryTimers.get(key)
  if (existing) clearTimeout(existing)

  const timer = setTimeout(async () => {
    inProcessExpiryTimers.delete(key)
    try {
      await expireCheckoutJob(orderId)
    } catch (err) {
      logger.error(`[checkoutQueue] in-process expiry failed for ${orderId}:`, err.message)
    }
  }, Math.max(0, delayMs))

  if (typeof timer.unref === 'function') {
    timer.unref()
  }

  inProcessExpiryTimers.set(key, timer)
  return true
}

export function buildExpiredCheckoutHoldQuery(now = new Date()) {
  return {
    paymentStatus: { $ne: 'paid' },
    checkoutExpiresAt: { $lte: now },
    stockReservedAtCheckout: true,
    stockReservationReleasedAt: null,
    stockReservationSettledAt: null,
  }
}

/**
 * Release stock for abandoned checkouts whose TTL passed (no Redis/BullMQ required).
 */
export async function sweepExpiredCheckoutHolds({ limit = 50, now = new Date() } = {}) {
  const orders = await Order.find(buildExpiredCheckoutHoldQuery(now))
    .select('_id')
    .limit(limit)
    .lean()

  let processed = 0
  for (const order of orders) {
    await expireCheckoutJob(order._id)
    processed += 1
  }

  return { processed, scanned: orders.length }
}

/**
 * When BullMQ is unavailable, schedule expiry in-process and sweep periodically
 * so abandoned checkouts still release reserved stock after restarts.
 */
export function startCheckoutExpiryFallback() {
  if (isCheckoutQueueEnabled()) return false
  if (inProcessSweepInterval) return true

  inProcessSweepStartupTimer = setTimeout(() => {
    inProcessSweepStartupTimer = null
    sweepExpiredCheckoutHolds().catch((err) => {
      logger.warn('[checkoutQueue] initial expiry sweep failed:', err.message)
    })
  }, IN_PROCESS_SWEEP_STARTUP_DELAY_MS)

  if (typeof inProcessSweepStartupTimer.unref === 'function') {
    inProcessSweepStartupTimer.unref()
  }

  inProcessSweepInterval = setInterval(() => {
    sweepExpiredCheckoutHolds().catch((err) => {
      logger.warn('[checkoutQueue] periodic expiry sweep failed:', err.message)
    })
  }, IN_PROCESS_SWEEP_INTERVAL_MS)

  if (typeof inProcessSweepInterval.unref === 'function') {
    inProcessSweepInterval.unref()
  }

  logger.log('[checkoutQueue] In-process checkout expiry fallback started (no Redis queue)')
  return true
}

export function stopCheckoutExpiryFallback() {
  for (const timer of inProcessExpiryTimers.values()) {
    clearTimeout(timer)
  }
  inProcessExpiryTimers.clear()

  if (inProcessSweepStartupTimer) {
    clearTimeout(inProcessSweepStartupTimer)
    inProcessSweepStartupTimer = null
  }

  if (inProcessSweepInterval) {
    clearInterval(inProcessSweepInterval)
    inProcessSweepInterval = null
  }
}

export async function enqueueCheckoutExpiry(orderId, delayMs) {
  const checkoutQueue = getCheckoutQueue()
  if (!checkoutQueue) {
    return scheduleInProcessCheckoutExpiry(orderId, delayMs)
  }

  try {
    const jobId = `checkout-expire-${orderId}`
    const existing = await checkoutQueue.getJob(jobId)
    if (existing) {
      await existing.remove()
    }

    await checkoutQueue.add(
      JOB_NAME,
      { orderId: String(orderId) },
      {
        jobId,
        delay: Math.max(0, delayMs),
        ...DEFAULT_QUEUE_JOB_OPTIONS,
      }
    )
    return true
  } catch (err) {
    logger.warn(`[checkoutQueue] enqueue failed for ${orderId}:`, err.message)
    return scheduleInProcessCheckoutExpiry(orderId, delayMs)
  }
}

export async function startCheckoutExpiryWorker() {
  if (!isCheckoutQueueEnabled()) {
    logger.log(
      '[checkoutQueue] Worker disabled — set REDIS_URL and ENABLE_CHECKOUT_QUEUE=true to enable'
    )
    return null
  }

  if (worker) return worker

  workerConnection = createRedisConnection('worker')
  worker = new Worker(
    QUEUE_NAME,
    async (job) => {
      const { orderId } = job.data || {}
      return expireCheckoutJob(orderId)
    },
    { connection: workerConnection }
  )

  attachQueueFailureHandlers(worker, QUEUE_NAME)
  attachBullMqWorkerErrorHandler(worker, 'checkoutQueue')

  logger.log('[checkoutQueue] Expiry worker started')
  return worker
}

export async function stopCheckoutExpiryWorker() {
  const refs = { worker, queue, workerConnection, queueConnection }
  worker = null
  queue = null
  workerConnection = null
  queueConnection = null
  await safeTeardownBullMq(refs)
}
