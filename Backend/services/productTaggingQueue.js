import logger from '../utils/logger.js'
import { Queue, Worker } from 'bullmq'
import { config } from '../config/env.js'
import { createRedisConnection, isRedisConfigured } from '../config/redisClient.js'
import {
  attachQueueFailureHandlers,
  DEFAULT_QUEUE_JOB_OPTIONS,
} from './queueFailureHandler.js'
import { tagProduct } from './productTagging.js'

const QUEUE_NAME = 'product-tagging'
const JOB_NAME = 'tag-product'

const DEFAULT_JOB_OPTIONS = DEFAULT_QUEUE_JOB_OPTIONS

let queue = null
let worker = null
let queueConnection = null
let workerConnection = null

export function isProductTaggingQueueEnabled() {
  return isRedisConfigured() && config.redis.productTaggingQueueEnabled
}

function getProductTaggingQueue() {
  if (!isProductTaggingQueueEnabled()) return null
  if (!queue) {
    queueConnection = createRedisConnection('product-tagging-queue')
    queue = new Queue(QUEUE_NAME, { connection: queueConnection })
  }
  return queue
}

export async function enqueueProductTagging(productId) {
  const taggingQueue = getProductTaggingQueue()
  if (!taggingQueue) return false

  const id = String(productId)
  const jobId = `tag-product-${id}`

  try {
    const existing = await taggingQueue.getJob(jobId)
    if (existing) {
      const state = await existing.getState()
      if (state === 'active' || state === 'waiting' || state === 'delayed') {
        return true
      }
      await existing.remove()
    }

    await taggingQueue.add(JOB_NAME, { productId: id }, { jobId, ...DEFAULT_JOB_OPTIONS })
    return true
  } catch (err) {
    logger.warn(`[productTaggingQueue] enqueue failed for product ${id}:`, err.message)
    return false
  }
}

function runTagProductDetached(productId) {
  tagProduct(productId).catch((err) => {
    logger.error(`[productTaggingQueue] in-process tagging failed for ${productId}:`, err.message)
  })
}

/** Queue product tagging when Redis is available; otherwise run in-process. */
export function scheduleProductTagging(productId) {
  if (config.isTest) {
    return runTagProductDetached(productId)
  }

  enqueueProductTagging(productId)
    .then((queued) => {
      if (!queued) runTagProductDetached(productId)
    })
    .catch((err) => {
      logger.warn(`[productTaggingQueue] schedule failed for ${productId}:`, err.message)
      runTagProductDetached(productId)
    })
}

export function tagProductInBackground(productId) {
  scheduleProductTagging(productId)
}

export async function startProductTaggingWorker() {
  if (!isProductTaggingQueueEnabled()) {
    logger.log(
      '[productTaggingQueue] Worker disabled — set REDIS_URL and ENABLE_PRODUCT_TAGGING_QUEUE=true'
    )
    return null
  }

  if (worker) return worker

  workerConnection = createRedisConnection('product-tagging-worker')
  worker = new Worker(
    QUEUE_NAME,
    async (job) => {
      const { productId } = job.data || {}
      if (!productId) {
        throw new Error('Missing productId')
      }
      return tagProduct(productId)
    },
    { connection: workerConnection, concurrency: 2 }
  )

  attachQueueFailureHandlers(worker, 'product-tagging')

  logger.log('[productTaggingQueue] Worker started')
  return worker
}

export async function stopProductTaggingWorker() {
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
