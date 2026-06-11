import app from './app/app.js'
import dbConnect from './config/dbConnect.js'
import { config, validateConfig } from './config/env.js'
import { scheduleEmbeddingSyncOnStartup } from './services/search/embeddingSyncService.js'
import { startCheckoutExpiryWorker, stopCheckoutExpiryWorker } from './services/checkoutQueue.js'

async function startServer() {
  validateConfig({ strict: config.isProduction })
  await dbConnect()
  scheduleEmbeddingSyncOnStartup()
  await startCheckoutExpiryWorker()

  const server = app.listen(config.server.port, config.server.host, () => {
    console.log(
      `Server is up on ${config.server.host}:${config.server.port} (${config.nodeEnv})`
    )
  })

  let shuttingDown = false
  async function shutdown(signal) {
    if (shuttingDown) return
    shuttingDown = true
    console.log(`${signal} received — shutting down`)
    await stopCheckoutExpiryWorker()
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
