/**
 * Dedicated BullMQ worker process (no HTTP server).
 * Usage: node worker.js
 * Set REDIS_URL and enable queue flags in .env.
 */
import dbConnect from './config/dbConnect.js'
import { config, validateConfig } from './config/env.js'
import { probeRedisHealth } from './config/redisClient.js'
import { startAllQueueWorkers } from './services/queueWorkers.js'
import { registerGracefulShutdown } from './utils/gracefulShutdown.js'

async function startWorkerProcess() {
  validateConfig({ strict: config.isProduction })
  await dbConnect()

  const redisOk = await probeRedisHealth()
  if (!redisOk && config.redis.url) {
    console.warn('[worker] Redis unavailable — exiting without queue workers')
    registerGracefulShutdown({ label: 'worker' })
    return
  }

  await startAllQueueWorkers()
  console.log(`[worker] Queue workers running (${config.nodeEnv})`)
  registerGracefulShutdown({ label: 'worker' })
}

startWorkerProcess().catch((err) => {
  console.error('[worker] Failed to start:', err.message)
  process.exit(1)
})
