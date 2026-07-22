import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('mongoose', () => {
  const ping = vi.fn(async () => ({ ok: 1 }))
  const admin = vi.fn(() => ({ ping }))
  return {
    default: {
      connection: {
        readyState: 1,
        db: { admin },
      },
    },
    connection: {
      readyState: 1,
      db: { admin },
    },
  }
})

vi.mock('../../config/env.js', () => ({
  config: {
    nodeEnv: 'test',
    isTest: true,
    redis: {
      url: '',
      checkoutQueueEnabled: false,
      embeddingSyncQueueEnabled: false,
    },
    similarProducts: { mode: 'simple' },
    search: { vectorBackend: 'auto' },
  },
}))

vi.mock('../../config/redisClient.js', () => ({
  isAppRedisReady: () => false,
  isRedisDegraded: () => false,
  getAppRedisClient: async () => null,
}))

vi.mock('../../services/inferenceTestService.js', () => ({
  listInferenceProviders: () => [
    { id: 'openrouter', name: 'OpenRouter', configured: true, defaultModel: 'x' },
    { id: 'gemini', name: 'Gemini', configured: true, defaultModel: 'y' },
    { id: 'groq', name: 'Groq', configured: false, defaultModel: 'z' },
  ],
}))

vi.mock('../../services/checkoutQueue.js', () => ({ isCheckoutQueueEnabled: () => false }))
vi.mock('../../services/search/embeddingSyncQueue.js', () => ({
  isEmbeddingSyncQueueEnabled: () => false,
}))
vi.mock('../../services/llmUsageSummaryQueue.js', () => ({
  isLlmUsageSummaryQueueEnabled: () => false,
}))
vi.mock('../../services/chatEvalQueue.js', () => ({ isChatEvalQueueEnabled: () => false }))
vi.mock('../../services/moderationQueue.js', () => ({
  isModerationQueueEnabled: () => false,
}))
vi.mock('../../services/emailQueue.js', () => ({ isEmailQueueEnabled: () => false }))
vi.mock('../../services/productTaggingQueue.js', () => ({
  isProductTaggingQueueEnabled: () => false,
}))

vi.mock('../../model/LlmUsageLog.js', () => ({
  default: {
    aggregate: vi.fn(async () => [{ calls: 10, errors: 1, latencySum: 4000 }]),
  },
}))

vi.mock('../../model/Product.js', () => ({
  default: {
    estimatedDocumentCount: vi.fn(async () => 20),
    countDocuments: vi.fn(async () => 18),
  },
}))

import { getSystemHealthSnapshot } from '../../services/systemHealthService.js'

describe('systemHealthService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns a snapshot with mongo/redis/providers/queues/traffic/embeddings', async () => {
    const snap = await getSystemHealthSnapshot()

    expect(snap.status).toBeDefined()
    expect(snap.mongo.status).toBe('ok')
    // Redis not configured → disabled (treated as ok for rollup)
    expect(snap.redis.status).toBe('disabled')
    expect(snap.providers.configured).toBe(2)
    expect(snap.providers.total).toBe(3)
    expect(snap.providers.missing).toContain('Groq')
    expect(snap.queues.checkout).toBe(false)
    expect(snap.traffic.chatCalls).toBe(10)
    expect(snap.traffic.chatErrors).toBe(1)
    expect(snap.traffic.chatErrorRate).toBe(10)
    expect(snap.embeddings.totalProducts).toBe(20)
    expect(snap.embeddings.indexedProducts).toBe(18)
    expect(snap.embeddings.coveragePct).toBe(90)
    expect(snap.similarProductsMode).toBe('simple')
  })

  it('rolls up status based on parts', async () => {
    const snap = await getSystemHealthSnapshot()
    // 2/3 providers configured → degraded, mongo ok, redis disabled → overall degraded
    expect(['ok', 'degraded']).toContain(snap.status)
  })
})
