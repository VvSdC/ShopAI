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

export async function startAllQueueWorkers() {
  await startCheckoutExpiryWorker()
  await startCheckoutFulfillmentWorker()
  await startEmbeddingSyncWorker()
  await startCouponCacheWorker()
  await startModerationWorker()
  await startProductTaggingWorker()
  await startLlmUsageSummaryWorker()
  await startEmailWorker()
}

export async function stopAllQueueWorkers() {
  await Promise.all([
    stopCheckoutExpiryWorker(),
    stopCheckoutFulfillmentWorker(),
    stopEmbeddingSyncWorker(),
    stopCouponCacheWorker(),
    stopModerationWorker(),
    stopProductTaggingWorker(),
    stopLlmUsageSummaryWorker(),
    stopEmailWorker(),
  ])
}
