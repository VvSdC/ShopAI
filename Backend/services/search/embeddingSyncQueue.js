import logger from '../../utils/logger.js'
import { Queue, Worker } from 'bullmq'
import { config } from '../../config/env.js'
import { createRedisConnection, isRedisConfigured } from '../../config/redisClient.js'
import { syncMissingProductEmbeddings } from './embeddingSyncService.js'

const QUEUE_NAME = 'embedding-sync'
const JOB_NAME = 'sync-missing-embeddings'
const STARTUP_JOB_ID = 'embedding-sync-startup'

let queue = null
let worker = null
let queueConnection = null
let workerConnection = null

export function isEmbeddingSyncQueueEnabled() {
  return isRedisConfigured() && config.redis.embeddingSyncQueueEnabled
}

function getEmbeddingSyncQueue() {
  if (!isEmbeddingSyncQueueEnabled()) return null
  if (!queue) {
    queueConnection = createRedisConnection('embedding-sync-queue')
    queue = new Queue(QUEUE_NAME, { connection: queueConnection })
  }
  return queue
}

export async function enqueueEmbeddingSyncRun(delayMs = 0) {
  const syncQueue = getEmbeddingSyncQueue()
  if (!syncQueue) return false

  try {
    const existing = await syncQueue.getJob(STARTUP_JOB_ID)
    if (existing) {
      const state = await existing.getState()
      if (state === 'active' || state === 'waiting' || state === 'delayed') {
        return true
      }
      await existing.remove()
    }

    await syncQueue.add(
      JOB_NAME,
      {},
      {
        jobId: STARTUP_JOB_ID,
        delay: Math.max(0, delayMs),
        removeOnComplete: true,
        removeOnFail: 50,
      }
    )
    return true
  } catch (err) {
    logger.warn('[embeddingSyncQueue] enqueue failed:', err.message)
    return false
  }
}

export async function startEmbeddingSyncWorker() {
  if (!isEmbeddingSyncQueueEnabled()) {
    logger.log(
      '[embeddingSyncQueue] Worker disabled — set REDIS_URL and ENABLE_EMBEDDING_SYNC_QUEUE=true'
    )
    return null
  }

  if (worker) return worker

  workerConnection = createRedisConnection('embedding-sync-worker')
  worker = new Worker(
    QUEUE_NAME,
    async () => syncMissingProductEmbeddings(),
    {
      connection: workerConnection,
      concurrency: 1,
    }
  )

  worker.on('failed', (job, err) => {
    logger.error(`[embeddingSyncQueue] Job ${job?.id} failed:`, err.message)
  })

  logger.log('[embeddingSyncQueue] Worker started')
  return worker
}

let syncInProgress = false

function runInProcessSyncDetached() {
  const timer = setTimeout(async () => {
    if (syncInProgress) return
    syncInProgress = true
    try {
      await syncMissingProductEmbeddings()
    } catch (err) {
      logger.error('[search] Auto-sync failed:', err.message)
    } finally {
      syncInProgress = false
    }
  }, config.search.syncStartupDelayMs)

  if (typeof timer.unref === 'function') {
    timer.unref()
  }
}

/**
 * Schedule startup embedding sync without blocking HTTP listen().
 * Prefers BullMQ when Redis + ENABLE_EMBEDDING_SYNC_QUEUE are set.
 */
export function scheduleEmbeddingSyncOnStartup() {
  if (!config.search.autoSyncEmbeddings) return
  if (config.isTest) return

  if (isEmbeddingSyncQueueEnabled()) {
    enqueueEmbeddingSyncRun(config.search.syncStartupDelayMs)
      .then((queued) => {
        if (queued) {
          logger.log(
            `[search] Embedding sync queued (delay ${config.search.syncStartupDelayMs}ms)`
          )
        }
      })
      .catch((err) => {
        logger.warn('[search] Failed to queue embedding sync:', err.message)
      })
    return
  }

  logger.log('[search] Embedding sync running in-process (no Redis queue)')
  runInProcessSyncDetached()
}

export async function stopEmbeddingSyncWorker() {
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
