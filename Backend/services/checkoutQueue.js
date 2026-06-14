import logger from '../utils/logger.js'
import { Queue, Worker } from 'bullmq'
import Order from '../model/Order.js'
import { config } from '../config/env.js'
import { getStripeClient, hasStripeConfigured } from '../config/stripeClient.js'
import { createRedisConnection, isRedisOperational, attachBullMqWorkerErrorHandler } from '../config/redisClient.js'

const QUEUE_NAME = 'checkout-expiry'
const JOB_NAME = 'expire-checkout'

function isPaidStatus(status) {
  return status === 'paid'
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

  if (isPaidStatus(order.paymentStatus)) {
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
  if (!order.checkoutExpiresAt || order.checkoutExpiresAt > now) {
    order.checkoutExpiresAt = now
    await order.save()
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

export async function enqueueCheckoutExpiry(orderId, delayMs) {
  const checkoutQueue = getCheckoutQueue()
  if (!checkoutQueue) return false

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
        removeOnComplete: true,
        removeOnFail: 100,
      }
    )
    return true
  } catch (err) {
    logger.warn(`[checkoutQueue] enqueue failed for ${orderId}:`, err.message)
    return false
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

  worker.on('failed', (job, err) => {
    logger.error(`[checkoutQueue] Job ${job?.id} failed:`, err.message)
  })

  attachBullMqWorkerErrorHandler(worker, 'checkoutQueue')

  logger.log('[checkoutQueue] Expiry worker started')
  return worker
}

export async function stopCheckoutExpiryWorker() {
  if (worker) {
    await worker.close()
    worker = null
  }
  if (queue) {
    await queue.close()
    queue = null
  }
  if (workerConnection) {
    await workerConnection.quit()
    workerConnection = null
  }
  if (queueConnection) {
    await queueConnection.quit()
    queueConnection = null
  }
}
