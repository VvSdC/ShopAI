import { describe, it, expect, vi, beforeEach } from 'vitest'
import { productNeedsEmbedding, getEmbeddingSpec } from '../../services/search/embeddingSyncService.js'
import { isEmbeddingSyncQueueEnabled } from '../../services/search/embeddingSyncQueue.js'

vi.mock('../../services/search/vectorIndexService.js', () => ({
  indexProductEmbedding: vi.fn(async () => ({ ok: true })),
}))

describe('embeddingSyncQueue', () => {
  it('is disabled without Redis queue env', () => {
    expect(isEmbeddingSyncQueueEnabled()).toBe(false)
  })
})

describe('syncMissingProductEmbeddings', () => {
  beforeEach(async () => {
    vi.resetModules()
    const { indexProductEmbedding } = await import('../../services/search/vectorIndexService.js')
    indexProductEmbedding.mockReset()
    indexProductEmbedding.mockResolvedValue({ ok: true })
  })

  it('streams products via cursor instead of loading the full catalog', async () => {
    const cursorMock = vi.fn(async function* () {
      yield { _id: '1', name: 'Stale' }
      yield {
        _id: '2',
        name: 'Fresh',
        embedding: [0.1],
        embeddedAt: new Date(),
        embeddingVersion: getEmbeddingSpec().version,
        embeddingModel: getEmbeddingSpec().model,
      }
    })

    const findChain = {
      select: vi.fn().mockReturnThis(),
      lean: vi.fn().mockReturnThis(),
      cursor: cursorMock,
    }

    vi.doMock('../../model/Product.js', () => ({
      default: {
        countDocuments: vi.fn().mockResolvedValue(2),
        find: vi.fn().mockReturnValue(findChain),
      },
    }))

    const { syncMissingProductEmbeddings: sync } = await import(
      '../../services/search/embeddingSyncService.js'
    )
    const { indexProductEmbedding } = await import('../../services/search/vectorIndexService.js')

    const result = await sync({ concurrency: 2, maxProducts: 0 })

    expect(findChain.cursor).toHaveBeenCalledWith({ batchSize: 500 })
    expect(indexProductEmbedding).toHaveBeenCalledTimes(1)
    expect(indexProductEmbedding).toHaveBeenCalledWith('1')
    expect(result).toEqual({ total: 2, pending: 1, indexed: 1, failed: 0 })
  })

  it('indexes stale products with bounded concurrency', async () => {
    let inFlight = 0
    let maxInFlight = 0

    const staleProducts = Array.from({ length: 8 }, (_, i) => ({
      _id: String(i + 1),
      name: `Stale ${i + 1}`,
    }))

    const cursorMock = vi.fn(async function* () {
      for (const product of staleProducts) {
        yield product
      }
    })

    const findChain = {
      select: vi.fn().mockReturnThis(),
      lean: vi.fn().mockReturnThis(),
      cursor: cursorMock,
    }

    vi.doMock('../../model/Product.js', () => ({
      default: {
        countDocuments: vi.fn().mockResolvedValue(staleProducts.length),
        find: vi.fn().mockReturnValue(findChain),
      },
    }))

    const { syncMissingProductEmbeddings: sync, runWithConcurrencyLimit } = await import(
      '../../services/search/embeddingSyncService.js'
    )
    const { indexProductEmbedding } = await import('../../services/search/vectorIndexService.js')

    indexProductEmbedding.mockImplementation(async () => {
      inFlight += 1
      maxInFlight = Math.max(maxInFlight, inFlight)
      await new Promise((resolve) => setTimeout(resolve, 15))
      inFlight -= 1
      return { ok: true }
    })

    const result = await sync({ concurrency: 3, maxProducts: 0 })

    expect(indexProductEmbedding).toHaveBeenCalledTimes(8)
    expect(maxInFlight).toBeLessThanOrEqual(3)
    expect(maxInFlight).toBeGreaterThan(1)
    expect(result).toEqual({
      total: 8,
      pending: 8,
      indexed: 8,
      failed: 0,
    })

    const ordered = await runWithConcurrencyLimit([1, 2, 3, 4], 2, async (n) => n * 2)
    expect(ordered).toEqual([2, 4, 6, 8])
  })
})

describe('productNeedsEmbedding', () => {
  it('flags products missing embeddings', () => {
    const spec = getEmbeddingSpec()
    expect(productNeedsEmbedding({ _id: '1', name: 'Hat' }, spec)).toBe(true)
    expect(
      productNeedsEmbedding(
        {
          _id: '2',
          name: 'Shirt',
          embedding: [0.1, 0.2],
          embeddedAt: new Date(),
          embeddingVersion: spec.version,
          embeddingModel: spec.model,
        },
        spec
      )
    ).toBe(false)
  })
})
