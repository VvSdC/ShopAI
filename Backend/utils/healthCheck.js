import mongoose from 'mongoose'
import { isRedisDegraded } from '../config/redisClient.js'
import { config } from '../config/env.js'

/**
 * @returns {Promise<{ status: 'ok' | 'degraded', mongo: string, redis: string, env: string, timestamp: string }>}
 */
export async function getHealthStatus() {
  const payload = {
    status: 'ok',
    env: config.nodeEnv,
    timestamp: new Date().toISOString(),
    redis: isRedisDegraded() ? 'degraded' : 'ok',
    mongo: 'ok',
  }

  if (mongoose.connection.readyState !== 1) {
    payload.mongo = 'down'
    payload.status = 'degraded'
    return payload
  }

  try {
    await mongoose.connection.db.admin().ping()
  } catch {
    payload.mongo = 'down'
    payload.status = 'degraded'
  }

  return payload
}
