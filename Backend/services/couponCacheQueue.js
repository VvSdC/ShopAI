import logger from '../utils/logger.js'
import { Queue, Worker } from 'bullmq'
import { createRedisConnection, isRedisConfigured } from '../config/redisClient.js'
import { invalidateCouponsCache } from './catalogCache.js'

const QUEUE_NAME = 'coupon-cache-bust'
const JOB_NAME = 'bust-coupon-cache'

let queue = null
let worker = null
let queueConnection = null
let workerConnection = null

export function isCouponCacheQueueEnabled() {
  return isRedisConfigured()
}

function getCouponCacheQueue() {
  if (!isCouponCacheQueueEnabled()) return null
  if (!queue) {
    queueConnection = createRedisConnection('coupon-cache-queue')
    queue = new Queue(QUEUE_NAME, { connection: queueConnection })
  }
  return queue
}

export async function enqueueCouponCacheBust(couponId, code, delayMs, reason = 'expire') {
  const couponQueue = getCouponCacheQueue()
  if (!couponQueue) return false

  const jobId = `coupon-cache-${reason}-${couponId}`
  const delay = Math.max(0, delayMs)

  try {
    const existing = await couponQueue.getJob(jobId)
    if (existing) {
      await existing.remove()
    }

    await couponQueue.add(
      JOB_NAME,
      { couponId: String(couponId), code: String(code || '').toUpperCase().trim() },
      {
        jobId,
        delay,
        removeOnComplete: true,
        removeOnFail: 50,
      }
    )
    return true
  } catch (err) {
    logger.warn(`[couponCacheQueue] enqueue failed for ${couponId}:`, err.message)
    return false
  }
}

/** Schedule cache bust at coupon start/end boundaries. */
export async function scheduleCouponCacheJobs(coupon) {
  if (!coupon) return

  await invalidateCouponsCache(coupon.code)

  const now = Date.now()
  const startMs = coupon.startDate ? new Date(coupon.startDate).getTime() : null
  const endMs = coupon.endDate ? new Date(coupon.endDate).getTime() : null

  if (startMs != null && startMs > now) {
    await enqueueCouponCacheBust(coupon._id, coupon.code, startMs - now, 'start')
  }
  if (endMs != null && endMs > now) {
    await enqueueCouponCacheBust(coupon._id, coupon.code, endMs - now, 'expire')
  }
}

async function bustCouponCacheJob({ code }) {
  await invalidateCouponsCache(code)
  return { ok: true }
}

export async function startCouponCacheWorker() {
  if (!isCouponCacheQueueEnabled()) return null
  if (worker) return worker

  workerConnection = createRedisConnection('coupon-cache-worker')
  worker = new Worker(
    QUEUE_NAME,
    async (job) => bustCouponCacheJob(job.data || {}),
    { connection: workerConnection, concurrency: 2 }
  )

  worker.on('failed', (job, err) => {
    logger.error(`[couponCacheQueue] Job ${job?.id} failed:`, err.message)
  })

  logger.log('[couponCacheQueue] Worker started')
  return worker
}

export async function stopCouponCacheWorker() {
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
