import { startCheckoutExpiryWorker, stopCheckoutExpiryWorker } from './checkoutQueue.js'
import { startCouponCacheWorker, stopCouponCacheWorker } from './couponCacheQueue.js'
import { startModerationWorker, stopModerationWorker } from './moderationQueue.js'
import { startProductTaggingWorker, stopProductTaggingWorker } from './productTaggingQueue.js'
import {
  startEmbeddingSyncWorker,
  stopEmbeddingSyncWorker,
} from './search/embeddingSyncQueue.js'

export async function startAllQueueWorkers() {
  await startCheckoutExpiryWorker()
  await startEmbeddingSyncWorker()
  await startCouponCacheWorker()
  await startModerationWorker()
  await startProductTaggingWorker()
}

export async function stopAllQueueWorkers() {
  await stopCheckoutExpiryWorker()
  await stopEmbeddingSyncWorker()
  await stopCouponCacheWorker()
  await stopModerationWorker()
  await stopProductTaggingWorker()
}
