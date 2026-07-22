import './openapi/initZodOpenApi.js'
import app from './app/app.js'
import dbConnect from './config/dbConnect.js'
import { config, validateConfig } from './config/env.js'
import { probeRedisHealth, installRedisProcessErrorGuard } from './config/redisClient.js'
import { scheduleEmbeddingSyncOnStartup } from './services/search/embeddingSyncQueue.js'
import {
  isCheckoutQueueEnabled,
  startCheckoutExpiryFallback,
} from './services/checkoutQueue.js'
import { startAllQueueWorkers } from './services/queueWorkers.js'
import { registerGracefulShutdown } from './utils/gracefulShutdown.js'
import logger from './utils/logger.js'

async function startServer() {
  validateConfig({ strict: config.isProduction })
  installRedisProcessErrorGuard()
  await dbConnect()

  const server = app.listen(config.server.port, config.server.host, () => {
    logger.log(
      `Server is up on ${config.server.host}:${config.server.port} (${config.nodeEnv})`
    )
  })

  scheduleEmbeddingSyncOnStartup()

  const redisOk = await probeRedisHealth()
  if (!redisOk && config.redis.url) {
    logger.warn('[redis] Unavailable at startup — API will run without Redis cache/queues')
  }

  if (config.redis.runQueueWorkersInApi) {
    if (config.isProduction) {
      logger.warn(
        '[queues] RUN_QUEUE_WORKERS_IN_API=true in production — BullMQ workers share the API event loop. Prefer false + npm run start:worker'
      )
    }
    await startAllQueueWorkers()
  } else {
    logger.log(
      '[queues] Workers disabled in API — run `npm run start:worker` (or node worker.js) as a separate process'
    )
  }

  if (!isCheckoutQueueEnabled()) {
    startCheckoutExpiryFallback()
  }

  registerGracefulShutdown({ server, label: 'server' })

  return server
}

startServer().catch((err) => {
  logger.error('Failed to start server:', err.message)
  process.exit(1)
})
