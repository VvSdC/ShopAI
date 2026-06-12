import app from './app/app.js'
import dbConnect from './config/dbConnect.js'
import { config, validateConfig } from './config/env.js'
import { scheduleEmbeddingSyncOnStartup } from './services/search/embeddingSyncQueue.js'
import { startAllQueueWorkers, stopAllQueueWorkers } from './services/queueWorkers.js'
import { shutdownLlmUsageLogger } from './services/llmUsageLogger.js'
import { shutdownCache } from './services/cacheService.js'

async function startServer() {
  validateConfig({ strict: config.isProduction })
  await dbConnect()

  const server = app.listen(config.server.port, config.server.host, () => {
    console.log(
      `Server is up on ${config.server.host}:${config.server.port} (${config.nodeEnv})`
    )
  })

  scheduleEmbeddingSyncOnStartup()

  if (config.redis.runQueueWorkersInApi) {
    if (config.isProduction) {
      console.warn(
        '[queues] RUN_QUEUE_WORKERS_IN_API=true in production — BullMQ workers share the API event loop. Prefer false + npm run start:worker'
      )
    }
    await startAllQueueWorkers()
  } else {
    console.log(
      '[queues] Workers disabled in API — run `npm run start:worker` (or node worker.js) as a separate process'
    )
  }

  let shuttingDown = false
  async function shutdown(signal) {
    if (shuttingDown) return
    shuttingDown = true
    console.log(`${signal} received — shutting down`)
    await stopAllQueueWorkers()
    await shutdownLlmUsageLogger()
    await shutdownCache()
    server.close(() => process.exit(0))
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT', () => shutdown('SIGINT'))

  return server
}

startServer().catch((err) => {
  console.error('Failed to start server:', err.message)
  process.exit(1)
})
