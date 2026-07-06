/**
 * Dedicated BullMQ worker process (no HTTP server).
 * Usage: node worker.js
 * Set REDIS_URL and enable queue flags in .env.
 */
import dbConnect from './config/dbConnect.js'
import { config, validateConfig } from './config/env.js'
import { probeRedisHealth, installRedisProcessErrorGuard } from './config/redisClient.js'
import { startAllQueueWorkers } from './services/queueWorkers.js'
import { registerGracefulShutdown } from './utils/gracefulShutdown.js'
import logger from './utils/logger.js'

async function startWorkerProcess() {
  validateConfig({ strict: config.isProduction })
  installRedisProcessErrorGuard()
  await dbConnect()

  const redisOk = await probeRedisHealth()
  if (!redisOk && config.redis.url) {
    logger.warn('[worker] Redis unavailable — exiting without queue workers')
    registerGracefulShutdown({ label: 'worker' })
    return
  }

  await startAllQueueWorkers()
  logger.log(`[worker] Queue workers running (${config.nodeEnv})`)
  registerGracefulShutdown({ label: 'worker' })
}

startWorkerProcess().catch((err) => {
  logger.error('[worker] Failed to start:', err.message)
  process.exit(1)
})
