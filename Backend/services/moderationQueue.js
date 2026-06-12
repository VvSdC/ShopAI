import logger from '../utils/logger.js'
import { Queue, Worker } from 'bullmq'
import { config } from '../config/env.js'
import { createRedisConnection, isRedisConfigured } from '../config/redisClient.js'
import { moderateReview, failOpenModerateReview } from './reviewModeration.js'

const QUEUE_NAME = 'review-moderation'
const JOB_NAME = 'moderate-review'

const DEFAULT_JOB_OPTIONS = {
  attempts: 3,
  backoff: { type: 'exponential', delay: 2000 },
  removeOnComplete: true,
  removeOnFail: 100,
}

let queue = null
let worker = null
let queueConnection = null
let workerConnection = null

export function isModerationQueueEnabled() {
  return isRedisConfigured() && config.redis.moderationQueueEnabled
}

function getModerationQueue() {
  if (!isModerationQueueEnabled()) return null
  if (!queue) {
    queueConnection = createRedisConnection('moderation-queue')
    queue = new Queue(QUEUE_NAME, { connection: queueConnection })
  }
  return queue
}

export async function enqueueReviewModeration(reviewId) {
  const moderationQueue = getModerationQueue()
  if (!moderationQueue) return false

  const id = String(reviewId)
  const jobId = `moderate-review-${id}`

  try {
    const existing = await moderationQueue.getJob(jobId)
    if (existing) {
      const state = await existing.getState()
      if (state === 'active' || state === 'waiting' || state === 'delayed') {
        return true
      }
      await existing.remove()
    }

    await moderationQueue.add(JOB_NAME, { reviewId: id }, { jobId, ...DEFAULT_JOB_OPTIONS })
    return true
  } catch (err) {
    logger.warn(`[moderationQueue] enqueue failed for review ${id}:`, err.message)
    return false
  }
}

function runModerateReviewDetached(reviewId) {
  moderateReview(reviewId).catch(async (err) => {
    logger.error(`[moderationQueue] in-process moderation failed for ${reviewId}:`, err.message)
    await failOpenModerateReview(reviewId)
  })
}

/** Queue review moderation when Redis is available; otherwise run in-process. */
export function scheduleReviewModeration(reviewId) {
  if (config.isTest) {
    return runModerateReviewDetached(reviewId)
  }

  enqueueReviewModeration(reviewId)
    .then((queued) => {
      if (!queued) runModerateReviewDetached(reviewId)
    })
    .catch((err) => {
      logger.warn(`[moderationQueue] schedule failed for ${reviewId}:`, err.message)
      runModerateReviewDetached(reviewId)
    })
}

export function moderateReviewInBackground(reviewId) {
  scheduleReviewModeration(reviewId)
}

export async function startModerationWorker() {
  if (!isModerationQueueEnabled()) {
    logger.log(
      '[moderationQueue] Worker disabled — set REDIS_URL and ENABLE_MODERATION_QUEUE=true'
    )
    return null
  }

  if (worker) return worker

  workerConnection = createRedisConnection('moderation-worker')
  worker = new Worker(
    QUEUE_NAME,
    async (job) => {
      const { reviewId } = job.data || {}
      if (!reviewId) {
        throw new Error('Missing reviewId')
      }
      try {
        return await moderateReview(reviewId)
      } catch (err) {
        const maxAttempts = job.opts?.attempts ?? DEFAULT_JOB_OPTIONS.attempts
        if (job.attemptsMade + 1 >= maxAttempts) {
          logger.error(`[moderationQueue] Job ${job.id} exhausted retries:`, err.message)
          return failOpenModerateReview(reviewId)
        }
        throw err
      }
    },
    { connection: workerConnection, concurrency: 2 }
  )

  worker.on('failed', (job, err) => {
    logger.error(`[moderationQueue] Job ${job?.id} failed:`, err.message)
  })

  logger.log('[moderationQueue] Worker started')
  return worker
}

export async function stopModerationWorker() {
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
