import './openapi/initZodOpenApi.js'
import app from './app/app.js'
import dbConnect from './config/dbConnect.js'
import { config, validateConfig } from './config/env.js'
import { probeRedisHealth, installRedisProcessErrorGuard } from './config/redisClient.js'
import { scheduleEmbeddingSyncOnStartup } from './services/search/embeddingSyncQueue.js'
import { startAllQueueWorkers } from './services/queueWorkers.js'
import { registerGracefulShutdown } from './utils/gracefulShutdown.js'

async function startServer() {
  validateConfig({ strict: config.isProduction })
  installRedisProcessErrorGuard()
  await dbConnect()

  const server = app.listen(config.server.port, config.server.host, () => {
    console.log(
      `Server is up on ${config.server.host}:${config.server.port} (${config.nodeEnv})`
    )
  })

  scheduleEmbeddingSyncOnStartup()

  const redisOk = await probeRedisHealth()
  if (!redisOk && config.redis.url) {
    console.warn('[redis] Unavailable at startup — API will run without Redis cache/queues')
  }

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

  registerGracefulShutdown({ server, label: 'server' })

  return server
}

startServer().catch((err) => {
  console.error('Failed to start server:', err.message)
  process.exit(1)
})
