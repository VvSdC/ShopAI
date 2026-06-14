import logger from '../utils/logger.js'
import { startEmailWorker, stopEmailWorker } from './emailQueue.js'
import { startCheckoutExpiryWorker, stopCheckoutExpiryWorker } from './checkoutQueue.js'
import {
  startCheckoutFulfillmentWorker,
  stopCheckoutFulfillmentWorker,
} from './checkoutFulfillmentQueue.js'
import { startCouponCacheWorker, stopCouponCacheWorker } from './couponCacheQueue.js'
import { startModerationWorker, stopModerationWorker } from './moderationQueue.js'
import { startProductTaggingWorker, stopProductTaggingWorker } from './productTaggingQueue.js'
import {
  startEmbeddingSyncWorker,
  stopEmbeddingSyncWorker,
} from './search/embeddingSyncQueue.js'
import {
  startLlmUsageSummaryWorker,
  stopLlmUsageSummaryWorker,
} from './llmUsageSummaryQueue.js'
import { isRedisOperational } from '../config/redisClient.js'

const WORKER_STARTERS = [
  ['checkoutExpiry', startCheckoutExpiryWorker],
  ['checkoutFulfillment', startCheckoutFulfillmentWorker],
  ['embeddingSync', startEmbeddingSyncWorker],
  ['couponCache', startCouponCacheWorker],
  ['moderation', startModerationWorker],
  ['productTagging', startProductTaggingWorker],
  ['llmUsageSummary', startLlmUsageSummaryWorker],
  ['email', startEmailWorker],
]

export async function startAllQueueWorkers() {
  if (!isRedisOperational()) {
    logger.log('[queues] Skipped — Redis is not operational')
    return
  }

  for (const [name, start] of WORKER_STARTERS) {
    try {
      await start()
    } catch (err) {
      logger.warn(`[queues] ${name} worker failed to start:`, err.message)
    }
  }
}

export async function stopAllQueueWorkers() {
  const stoppers = [
    stopCheckoutExpiryWorker,
    stopCheckoutFulfillmentWorker,
    stopEmbeddingSyncWorker,
    stopCouponCacheWorker,
    stopModerationWorker,
    stopProductTaggingWorker,
    stopLlmUsageSummaryWorker,
    stopEmailWorker,
  ]

  await Promise.all(
    stoppers.map(async (stop) => {
      try {
        await stop()
      } catch (err) {
        logger.warn('[queues] worker stop failed:', err.message)
      }
    })
  )
}
