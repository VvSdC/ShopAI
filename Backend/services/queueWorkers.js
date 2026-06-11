import { startCheckoutExpiryWorker, stopCheckoutExpiryWorker } from './checkoutQueue.js'
import { startCouponCacheWorker, stopCouponCacheWorker } from './couponCacheQueue.js'
import {
  startEmbeddingSyncWorker,
  stopEmbeddingSyncWorker,
} from './search/embeddingSyncQueue.js'

export async function startAllQueueWorkers() {
  await startCheckoutExpiryWorker()
  await startEmbeddingSyncWorker()
  await startCouponCacheWorker()
}

export async function stopAllQueueWorkers() {
  await stopCheckoutExpiryWorker()
  await stopEmbeddingSyncWorker()
  await stopCouponCacheWorker()
}
