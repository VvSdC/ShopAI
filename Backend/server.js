import app from './app/app.js'
import dbConnect from './config/dbConnect.js'
import { config, validateConfig } from './config/env.js'
import { scheduleEmbeddingSyncOnStartup } from './services/search/embeddingSyncQueue.js'
import { startAllQueueWorkers, stopAllQueueWorkers } from './services/queueWorkers.js'

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
    await startAllQueueWorkers()
  } else {
    console.log('[queues] Workers disabled in API — run node worker.js separately')
  }

  let shuttingDown = false
  async function shutdown(signal) {
    if (shuttingDown) return
    shuttingDown = true
    console.log(`${signal} received — shutting down`)
    await stopAllQueueWorkers()
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
