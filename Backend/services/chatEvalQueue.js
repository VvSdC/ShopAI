import logger from '../utils/logger.js'
import { Queue, Worker } from 'bullmq'
import { config } from '../config/env.js'
import {
  createRedisConnection,
  isRedisOperational,
  attachBullMqWorkerErrorHandler,
} from '../config/redisClient.js'
import { attachQueueFailureHandlers } from './queueFailureHandler.js'
import { safeTeardownBullMq } from './bullMqTeardown.js'
import { executeChatEvalJob } from './chatEvalRunner.js'
import { patchChatEvalJob } from './chatEvalJobStore.js'

const QUEUE_NAME = 'chat-eval'
const JOB_NAME = 'run-chat-eval'
const EVAL_LOCK_MS = 10 * 60 * 1000

const JOB_OPTIONS = {
  attempts: 1,
  removeOnComplete: true,
  removeOnFail: 50,
}

let queue = null
let worker = null
let queueConnection = null
let workerConnection = null

export function isChatEvalQueueEnabled() {
  return isRedisOperational() && config.redis.chatEvalQueueEnabled
}

function getChatEvalQueue() {
  if (!isChatEvalQueueEnabled()) return null
  if (!queue) {
    queueConnection = createRedisConnection('chat-eval-queue')
    queue = new Queue(QUEUE_NAME, { connection: queueConnection })
  }
  return queue
}

export async function enqueueChatEvalJob({ jobId, userId, userName, caseIds }) {
  const evalQueue = getChatEvalQueue()
  if (!evalQueue) return false

  const bullJobId = `chat-eval-${jobId}`

  try {
    const existing = await evalQueue.getJob(bullJobId)
    if (existing) {
      const state = await existing.getState()
      if (state === 'active' || state === 'waiting' || state === 'delayed') {
        return true
      }
      await existing.remove()
    }

    await evalQueue.add(
      JOB_NAME,
      { jobId, userId: String(userId), userName, caseIds },
      { jobId: bullJobId, ...JOB_OPTIONS }
    )
    return true
  } catch (err) {
    logger.warn(`[chatEvalQueue] enqueue failed for job ${jobId}:`, err.message)
    return false
  }
}

function runChatEvalDetached(params) {
  executeChatEvalJob(params).catch((err) => {
    logger.error(`[chatEvalQueue] in-process eval failed for ${params.jobId}:`, err.message)
  })
}

/** Queue eval when Redis is available; otherwise run in-process with heartbeat updates. */
export function scheduleChatEvalJob(params) {
  if (config.isTest) {
    runChatEvalDetached(params)
    return
  }

  enqueueChatEvalJob(params)
    .then((queued) => {
      if (queued) return
      if (config.isProduction) {
        logger.warn(
          `[chatEvalQueue] Eval ${params.jobId} skipped in production without Redis queue — set ENABLE_CHAT_EVAL_QUEUE=true`
        )
        return patchChatEvalJob(params.jobId, {
          status: 'failed',
          error: 'Chat evaluation queue is not configured in production',
          finishedAt: new Date().toISOString(),
          lastHeartbeatAt: new Date(),
        }).catch((patchErr) => {
          logger.warn(`[chatEvalQueue] could not mark job ${params.jobId} failed:`, patchErr.message)
        })
      }
      runChatEvalDetached(params)
    })
    .catch((err) => {
      logger.warn(`[chatEvalQueue] schedule failed for ${params.jobId}:`, err.message)
      if (config.isProduction) return
      runChatEvalDetached(params)
    })
}

export async function startChatEvalWorker() {
  if (!isChatEvalQueueEnabled()) {
    logger.log(
      '[chatEvalQueue] Worker disabled — set REDIS_URL and ENABLE_CHAT_EVAL_QUEUE=true'
    )
    return null
  }

  if (worker) return worker

  workerConnection = createRedisConnection('chat-eval-worker')
  worker = new Worker(
    QUEUE_NAME,
    async (job) => {
      const { jobId, userId, userName, caseIds } = job.data || {}
      if (!jobId || !userId) {
        throw new Error('Missing jobId or userId')
      }

      return executeChatEvalJob({
        jobId,
        userId,
        userName: userName || 'Admin',
        caseIds: Array.isArray(caseIds) && caseIds.length ? caseIds : null,
        onProgressExtra: () => job.updateProgress(job.progress || 0),
      })
    },
    {
      connection: workerConnection,
      concurrency: 1,
      lockDuration: EVAL_LOCK_MS,
    }
  )

  worker.on('failed', async (job, err) => {
    if (!job?.data?.jobId) return
    try {
      await patchChatEvalJob(job.data.jobId, {
        status: 'failed',
        error: err?.message || 'Evaluation job failed in queue worker',
        finishedAt: new Date().toISOString(),
        lastHeartbeatAt: new Date(),
      })
    } catch (patchErr) {
      logger.warn(`[chatEvalQueue] could not mark job ${job.data.jobId} failed:`, patchErr.message)
    }
  })

  attachQueueFailureHandlers(worker, 'chat-eval')
  attachBullMqWorkerErrorHandler(worker, 'chatEvalQueue')

  logger.log('[chatEvalQueue] Worker started')
  return worker
}

export async function stopChatEvalWorker() {
  const refs = { worker, queue, workerConnection, queueConnection }
  worker = null
  queue = null
  workerConnection = null
  queueConnection = null
  await safeTeardownBullMq(refs)
}
