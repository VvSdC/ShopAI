import logger from '../utils/logger.js'
import { Queue, Worker } from 'bullmq'
import { config } from '../config/env.js'
import { getStripeClient, hasStripeConfigured } from '../config/stripeClient.js'
import { createRedisConnection, isRedisConfigured } from '../config/redisClient.js'
import { orderService } from './orderService.js'
import {
  attachQueueFailureHandlers,
  DEFAULT_QUEUE_JOB_OPTIONS,
} from './queueFailureHandler.js'

const QUEUE_NAME = 'checkout-fulfillment'
const JOB_NAME = 'apply-stripe-checkout'
const DEFAULT_JOB_OPTIONS = DEFAULT_QUEUE_JOB_OPTIONS

let queue = null
let worker = null
let queueConnection = null
let workerConnection = null

export function isCheckoutFulfillmentQueueEnabled() {
  return isRedisConfigured() && config.redis.checkoutQueueEnabled
}

function getCheckoutFulfillmentQueue() {
  if (!isCheckoutFulfillmentQueueEnabled()) return null
  if (!queue) {
    queueConnection = createRedisConnection('checkout-fulfillment-queue')
    queue = new Queue(QUEUE_NAME, { connection: queueConnection })
  }
  return queue
}

/**
 * Queue paid-order fulfillment (DB update, stock, confirmation email).
 * Uses Stripe event id as job id so webhook retries dedupe safely.
 */
export async function enqueueCheckoutFulfillment({
  orderId,
  sessionId,
  receiptEmail = null,
  stripeEventId,
}) {
  const fulfillmentQueue = getCheckoutFulfillmentQueue()
  if (!fulfillmentQueue) return false

  const id = String(orderId)
  const session = String(sessionId)
  const eventId = String(stripeEventId || `${id}-${session}`)

  try {
    const jobId = `checkout-fulfill-${eventId}`
    const existing = await fulfillmentQueue.getJob(jobId)
    if (existing) {
      const state = await existing.getState()
      if (state === 'active' || state === 'waiting' || state === 'delayed') {
        return true
      }
      if (state === 'completed') {
        return true
      }
      await existing.remove()
    }

    await fulfillmentQueue.add(
      JOB_NAME,
      {
        orderId: id,
        sessionId: session,
        receiptEmail,
        stripeEventId: eventId,
      },
      { jobId, ...DEFAULT_JOB_OPTIONS }
    )
    return true
  } catch (err) {
    logger.warn(`[checkoutFulfillmentQueue] enqueue failed for order ${id}:`, err.message)
    return false
  }
}

export async function processCheckoutFulfillmentJob({
  orderId,
  sessionId,
  receiptEmail,
}) {
  if (!hasStripeConfigured()) {
    throw new Error('Stripe is not configured')
  }

  const stripe = getStripeClient()
  const session = await stripe.checkout.sessions.retrieve(String(sessionId))

  const result = await orderService.applyStripeCheckoutSession(orderId, session, {
    receiptEmail,
  })

  if (!result.updatedOrder) {
    logger.error(`[checkoutFulfillmentQueue] Order not found: ${orderId}`)
    return { ok: false, reason: 'order_not_found' }
  }

  const { updatedOrder, fulfillment } = result
  logger.log(
    `[checkoutFulfillmentQueue] Order ${updatedOrder._id} → ${updatedOrder.paymentStatus}`
  )

  if (session.payment_status === 'paid' && fulfillment?.emailSent) {
    logger.log(`[checkoutFulfillmentQueue] Confirmation email sent for ${updatedOrder.orderNumber}`)
  } else if (fulfillment?.processed && !fulfillment?.emailSent) {
    logger.warn(
      `[checkoutFulfillmentQueue] Order processed but email failed:`,
      fulfillment.emailError
    )
  }

  return { ok: true, orderId: String(updatedOrder._id), fulfillment }
}

export async function startCheckoutFulfillmentWorker() {
  if (!isCheckoutFulfillmentQueueEnabled()) {
    logger.log(
      '[checkoutFulfillmentQueue] Worker disabled — set REDIS_URL and ENABLE_CHECKOUT_QUEUE=true'
    )
    return null
  }

  if (worker) return worker

  workerConnection = createRedisConnection('checkout-fulfillment-worker')
  worker = new Worker(
    QUEUE_NAME,
    async (job) => {
      const { orderId, sessionId, receiptEmail } = job.data || {}
      if (!orderId || !sessionId) {
        throw new Error('Missing orderId or sessionId')
      }
      return processCheckoutFulfillmentJob({ orderId, sessionId, receiptEmail })
    },
    { connection: workerConnection, concurrency: 3 }
  )

  attachQueueFailureHandlers(worker, 'checkout-fulfillment')

  logger.log('[checkoutFulfillmentQueue] Worker started (concurrency 3)')
  return worker
}

export async function stopCheckoutFulfillmentWorker() {
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
