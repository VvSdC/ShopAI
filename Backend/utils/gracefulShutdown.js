import mongoose from 'mongoose'
import { stopAllQueueWorkers } from '../services/queueWorkers.js'
import { shutdownLlmUsageLogger } from '../services/llmUsageLogger.js'
import { shutdownCache } from '../services/cacheService.js'
import logger from './logger.js'

const SHUTDOWN_TIMEOUT_MS = 30_000

function closeHttpServer(server) {
  if (!server) return Promise.resolve()
  return new Promise((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()))
  })
}

/**
 * Register SIGTERM/SIGINT handlers for Render, Kubernetes, and local dev.
 * Drains BullMQ workers (finishes in-flight jobs) before closing HTTP and Redis.
 *
 * @param {{ server?: import('http').Server | null, label?: string }} [options]
 */
export function registerGracefulShutdown({ server = null, label = 'app' } = {}) {
  let shuttingDown = false

  async function shutdown(signal) {
    if (shuttingDown) return
    shuttingDown = true
    logger.log(`[${label}] ${signal} received — graceful shutdown`)

    const forceTimer = setTimeout(() => {
      logger.error(
        `[${label}] shutdown timed out after ${SHUTDOWN_TIMEOUT_MS}ms — forcing exit`
      )
      process.exit(1)
    }, SHUTDOWN_TIMEOUT_MS)
    if (typeof forceTimer.unref === 'function') {
      forceTimer.unref()
    }

    try {
      logger.log(`[${label}] draining BullMQ workers (worker.close — finish active jobs)…`)
      await stopAllQueueWorkers()

      if (server) {
        logger.log(`[${label}] closing HTTP server…`)
        await closeHttpServer(server)
      }

      await shutdownLlmUsageLogger()
      await shutdownCache()

      if (mongoose.connection.readyState !== 0) {
        await mongoose.connection.close()
      }

      clearTimeout(forceTimer)
      logger.log(`[${label}] shutdown complete`)
      process.exit(0)
    } catch (err) {
      clearTimeout(forceTimer)
      logger.error(`[${label}] shutdown error:`, err.message)
      process.exit(1)
    }
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT', () => shutdown('SIGINT'))
}
