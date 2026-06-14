import { isRedisDegraded } from '../config/redisClient.js'
import logger from '../utils/logger.js'

function swallowErrors(emitter) {
  if (emitter && typeof emitter.on === 'function') {
    emitter.on('error', () => {})
  }
}

function collectWorkerEmitters(worker) {
  const emitters = [worker]
  if (worker?.connection) emitters.push(worker.connection)
  if (worker?.blockingConnection) emitters.push(worker.blockingConnection)
  for (const conn of emitters) {
    if (conn?.client) emitters.push(conn.client)
  }
  return emitters
}

/**
 * Close BullMQ worker/queue and Redis connections without crashing when Redis is down.
 * Uses force disconnect when Redis is already degraded (quota, connection closed, etc.).
 */
export async function safeTeardownBullMq({
  worker = null,
  queue = null,
  workerConnection = null,
  queueConnection = null,
  force = isRedisDegraded(),
} = {}) {
  if (worker) {
    for (const emitter of collectWorkerEmitters(worker)) {
      swallowErrors(emitter)
    }
    try {
      await Promise.race([
        worker.close(force),
        new Promise((resolve) => setTimeout(resolve, force ? 500 : 5000)),
      ])
    } catch (err) {
      logger.warn('[bullmq] worker close:', err.message)
    }
  }

  if (queue) {
    swallowErrors(queue)
    try {
      await Promise.race([
        queue.close(),
        new Promise((resolve) => setTimeout(resolve, force ? 500 : 5000)),
      ])
    } catch (err) {
      logger.warn('[bullmq] queue close:', err.message)
    }
  }

  for (const conn of [workerConnection, queueConnection]) {
    if (!conn) continue
    swallowErrors(conn)
    try {
      if (force || isRedisDegraded()) {
        conn.disconnect()
      } else {
        await Promise.race([
          conn.quit(),
          new Promise((resolve) => setTimeout(resolve, 3000)),
        ])
      }
    } catch {
      try {
        conn.disconnect()
      } catch {
        // ignore
      }
    }
  }
}
