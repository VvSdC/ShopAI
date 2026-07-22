/**
 * System health snapshot for the Developer Analytics dashboard.
 *
 * Uses only what's already available in the runtime — no external metrics
 * shipper. Everything is on-demand so this is safe to poll every 30s.
 */
import mongoose from 'mongoose'
import { config } from '../config/env.js'
import {
  isAppRedisReady,
  isRedisDegraded,
  getAppRedisClient,
} from '../config/redisClient.js'
import { listInferenceProviders } from './inferenceTestService.js'
import LlmUsageLog from '../model/LlmUsageLog.js'
import Product from '../model/Product.js'
import { isCheckoutQueueEnabled } from './checkoutQueue.js'
import { isEmbeddingSyncQueueEnabled } from './search/embeddingSyncQueue.js'
import { isLlmUsageSummaryQueueEnabled } from './llmUsageSummaryQueue.js'
import { isChatEvalQueueEnabled } from './chatEvalQueue.js'
import { isModerationQueueEnabled } from './moderationQueue.js'
import { isEmailQueueEnabled } from './emailQueue.js'
import { isProductTaggingQueueEnabled } from './productTaggingQueue.js'
import logger from '../utils/logger.js'

async function checkMongo() {
  if (mongoose.connection.readyState !== 1) {
    return { status: 'down', latencyMs: 0, detail: 'Not connected' }
  }
  const started = Date.now()
  try {
    await mongoose.connection.db.admin().ping()
    return { status: 'ok', latencyMs: Date.now() - started, detail: null }
  } catch (err) {
    return { status: 'down', latencyMs: Date.now() - started, detail: err.message }
  }
}

async function checkRedis() {
  if (!isAppRedisReady()) {
    return {
      status: config.redis.url ? 'degraded' : 'disabled',
      latencyMs: 0,
      detail: isRedisDegraded()
        ? 'Client reports degraded state'
        : config.redis.url
          ? 'Not ready yet'
          : 'REDIS_URL not configured (queues + cache off)',
    }
  }
  const started = Date.now()
  try {
    const redis = await getAppRedisClient()
    if (!redis) return { status: 'disabled', latencyMs: 0, detail: 'Client unavailable' }
    await redis.ping()
    return { status: 'ok', latencyMs: Date.now() - started, detail: null }
  } catch (err) {
    return { status: 'degraded', latencyMs: Date.now() - started, detail: err.message }
  }
}

function providerHealthSnapshot() {
  const providers = listInferenceProviders()
  const configuredCount = providers.filter((p) => p.configured).length
  return {
    total: providers.length,
    configured: configuredCount,
    missing: providers.filter((p) => !p.configured).map((p) => p.name),
    providers: providers.map((p) => ({
      id: p.id,
      name: p.name,
      configured: p.configured,
      defaultModel: p.defaultModel || null,
    })),
    status:
      configuredCount === 0
        ? 'down'
        : configuredCount < 2
          ? 'degraded'
          : 'ok',
  }
}

function queueHealth() {
  return {
    checkout: isCheckoutQueueEnabled(),
    embeddingSync: isEmbeddingSyncQueueEnabled(),
    llmUsageSummary: isLlmUsageSummaryQueueEnabled(),
    chatEval: isChatEvalQueueEnabled(),
    moderation: isModerationQueueEnabled(),
    email: isEmailQueueEnabled(),
    productTagging: isProductTaggingQueueEnabled(),
  }
}

async function recentTrafficSnapshot() {
  const cutoff = new Date(Date.now() - 60 * 60 * 1000)
  const [row] = await LlmUsageLog.aggregate([
    { $match: { createdAt: { $gte: cutoff }, source: 'chat' } },
    {
      $group: {
        _id: null,
        calls: { $sum: 1 },
        errors: { $sum: { $cond: ['$success', 0, 1] } },
        latencySum: { $sum: '$latencyMs' },
      },
    },
  ])
  const calls = row?.calls || 0
  const errors = row?.errors || 0
  return {
    windowMinutes: 60,
    chatCalls: calls,
    chatErrors: errors,
    chatErrorRate: calls > 0 ? Math.round((errors / calls) * 100) : 0,
    avgChatLatencyMs: calls > 0 ? Math.round((row.latencySum || 0) / calls) : 0,
  }
}

async function embeddingCoverageSnapshot() {
  try {
    const [total, indexed] = await Promise.all([
      Product.estimatedDocumentCount(),
      Product.countDocuments({ embedding: { $exists: true, $ne: [] } }),
    ])
    const ratio = total > 0 ? Math.round((indexed / total) * 100) : 100
    return {
      totalProducts: total,
      indexedProducts: indexed,
      coveragePct: ratio,
      status: ratio >= 95 ? 'ok' : ratio >= 70 ? 'degraded' : 'down',
    }
  } catch (err) {
    logger.warn('[systemHealth] embedding coverage failed:', err.message)
    return { totalProducts: 0, indexedProducts: 0, coveragePct: 0, status: 'unknown' }
  }
}

function processInfo() {
  const mem = process.memoryUsage()
  return {
    nodeVersion: process.version,
    uptimeSeconds: Math.round(process.uptime()),
    memoryMb: {
      rss: Math.round(mem.rss / 1024 / 1024),
      heapUsed: Math.round(mem.heapUsed / 1024 / 1024),
      heapTotal: Math.round(mem.heapTotal / 1024 / 1024),
    },
    env: config.nodeEnv,
  }
}

function rollupStatus(parts) {
  if (parts.some((p) => p === 'down')) return 'degraded'
  if (parts.some((p) => p === 'degraded')) return 'degraded'
  return 'ok'
}

export async function getSystemHealthSnapshot() {
  const [mongo, redis, traffic, embeddings] = await Promise.all([
    checkMongo(),
    checkRedis(),
    recentTrafficSnapshot(),
    embeddingCoverageSnapshot(),
  ])

  const providers = providerHealthSnapshot()
  const queues = queueHealth()
  const process = processInfo()

  const status = rollupStatus([
    mongo.status,
    redis.status === 'disabled' ? 'ok' : redis.status,
    providers.status,
    embeddings.status === 'unknown' ? 'ok' : embeddings.status,
  ])

  return {
    status,
    checkedAt: new Date().toISOString(),
    mongo,
    redis,
    providers,
    queues,
    traffic,
    embeddings,
    process,
    similarProductsMode: String(config.similarProducts?.mode || 'simple').toLowerCase(),
    vectorSearchBackend: String(config.search.vectorBackend || 'auto').toLowerCase(),
  }
}
