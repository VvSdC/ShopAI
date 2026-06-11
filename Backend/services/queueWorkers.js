import { startCheckoutExpiryWorker, stopCheckoutExpiryWorker } from './checkoutQueue.js'
import {
  startEmbeddingSyncWorker,
  stopEmbeddingSyncWorker,
} from './search/embeddingSyncQueue.js'

export async function startAllQueueWorkers() {
  await startCheckoutExpiryWorker()
  await startEmbeddingSyncWorker()
}

export async function stopAllQueueWorkers() {
  await Promise.all([stopCheckoutExpiryWorker(), stopEmbeddingSyncWorker()])
}
