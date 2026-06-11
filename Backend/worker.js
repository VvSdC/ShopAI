/**
 * Dedicated BullMQ worker process (no HTTP server).
 * Usage: node worker.js
 * Set REDIS_URL and enable queue flags in .env.
 */
import dbConnect from './config/dbConnect.js'
import { config, validateConfig } from './config/env.js'
import { startAllQueueWorkers, stopAllQueueWorkers } from './services/queueWorkers.js'

async function startWorkerProcess() {
  validateConfig({ strict: config.isProduction })
  await dbConnect()
  await startAllQueueWorkers()
  console.log(`[worker] Queue workers running (${config.nodeEnv})`)
}

let shuttingDown = false
async function shutdown(signal) {
  if (shuttingDown) return
  shuttingDown = true
  console.log(`[worker] ${signal} received — shutting down`)
  await stopAllQueueWorkers()
  process.exit(0)
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))

startWorkerProcess().catch((err) => {
  console.error('[worker] Failed to start:', err.message)
  process.exit(1)
})
