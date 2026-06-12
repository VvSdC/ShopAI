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
  beforeEach(() => {
    vi.resetModules()
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

    const result = await sync({ delayMs: 0, maxProducts: 0 })

    expect(findChain.cursor).toHaveBeenCalledWith({ batchSize: 500 })
    expect(indexProductEmbedding).toHaveBeenCalledTimes(1)
    expect(indexProductEmbedding).toHaveBeenCalledWith('1')
    expect(result).toEqual({ total: 2, pending: 1, indexed: 1, failed: 0 })
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
