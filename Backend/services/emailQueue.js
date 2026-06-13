import logger from '../utils/logger.js'
import { Queue, Worker } from 'bullmq'
import { config } from '../config/env.js'
import { createRedisConnection, isRedisConfigured } from '../config/redisClient.js'
import {
  attachQueueFailureHandlers,
  DEFAULT_QUEUE_JOB_OPTIONS,
} from './queueFailureHandler.js'
import { sendWelcomeEmail } from './emailService.js'

const QUEUE_NAME = 'email'
const JOB_WELCOME = 'welcome'

const DEFAULT_JOB_OPTIONS = DEFAULT_QUEUE_JOB_OPTIONS

let queue = null
let worker = null
let queueConnection = null
let workerConnection = null

export function isEmailQueueEnabled() {
  return isRedisConfigured() && config.redis.emailQueueEnabled
}

function getEmailQueue() {
  if (!isEmailQueueEnabled()) return null
  if (!queue) {
    queueConnection = createRedisConnection('email-queue')
    queue = new Queue(QUEUE_NAME, { connection: queueConnection })
  }
  return queue
}

function normalizeWelcomePayload(email, name) {
  return {
    email: String(email || '')
      .trim()
      .toLowerCase(),
    name: String(name || '').trim(),
  }
}

export async function enqueueWelcomeEmail(email, name) {
  const emailQueue = getEmailQueue()
  if (!emailQueue) return false

  const payload = normalizeWelcomePayload(email, name)
  if (!payload.email) return false

  const jobId = `welcome-${payload.email}`

  try {
    const existing = await emailQueue.getJob(jobId)
    if (existing) {
      const state = await existing.getState()
      if (state === 'active' || state === 'waiting' || state === 'delayed') {
        return true
      }
      await existing.remove()
    }

    await emailQueue.add(JOB_WELCOME, payload, { jobId, ...DEFAULT_JOB_OPTIONS })
    return true
  } catch (err) {
    logger.warn(`[emailQueue] enqueue welcome failed for ${payload.email}:`, err.message)
    return false
  }
}

function runWelcomeEmailDetached({ email, name }) {
  sendWelcomeEmail(email, name).catch((err) => {
    logger.error(`[emailQueue] in-process welcome email failed for ${email}:`, err.message)
  })
}

/** Queue welcome email when Redis is available; otherwise send in-process without blocking HTTP. */
export function scheduleWelcomeEmail(email, name) {
  const payload = normalizeWelcomePayload(email, name)
  if (!payload.email) return

  if (config.isTest) {
    runWelcomeEmailDetached(payload)
    return
  }

  enqueueWelcomeEmail(payload.email, payload.name)
    .then((queued) => {
      if (!queued) runWelcomeEmailDetached(payload)
    })
    .catch((err) => {
      logger.warn(`[emailQueue] schedule welcome failed for ${payload.email}:`, err.message)
      runWelcomeEmailDetached(payload)
    })
}

export async function startEmailWorker() {
  if (!isEmailQueueEnabled()) {
    logger.log('[emailQueue] Worker disabled — set REDIS_URL and ENABLE_EMAIL_QUEUE=true')
    return null
  }

  if (worker) return worker

  workerConnection = createRedisConnection('email-worker')
  worker = new Worker(
    QUEUE_NAME,
    async (job) => {
      if (job.name !== JOB_WELCOME) {
        throw new Error(`Unknown email job: ${job.name}`)
      }

      const { email, name } = job.data || {}
      if (!email) {
        throw new Error('Missing email')
      }

      await sendWelcomeEmail(email, name)
      return { ok: true }
    },
    { connection: workerConnection, concurrency: 3 }
  )

  attachQueueFailureHandlers(worker, QUEUE_NAME)

  worker.on('failed', (job, err) => {
    logger.error(`[emailQueue] Job ${job?.id} failed:`, err.message)
  })

  logger.log('[emailQueue] Worker started')
  return worker
}

export async function stopEmailWorker() {
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
