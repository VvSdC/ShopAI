import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockFind = vi.fn()
const mockAggregate = vi.fn()

vi.mock('../../model/Product.js', () => ({
  default: {
    find: (...args) => mockFind(...args),
    aggregate: (...args) => mockAggregate(...args),
  },
}))

describe('vectorSearchLocal', () => {
  beforeEach(() => {
    mockFind.mockReset()
    mockAggregate.mockReset()
  })

  it('scores with embedding-only fetch, then hydrates without embedding field', async () => {
    const idA = '507f1f77bcf86cd799439011'
    const idB = '507f1f77bcf86cd799439012'

    const chainEmbedding = {
      select: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([
        { _id: idA, embedding: [1, 0] },
        { _id: idB, embedding: [0.5, 0.5] },
      ]),
    }

    const chainHydrate = {
      select: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([
        { _id: idA, name: 'Alpha' },
        { _id: idB, name: 'Beta' },
      ]),
    }

    mockFind
      .mockReturnValueOnce(chainEmbedding)
      .mockReturnValueOnce(chainHydrate)

    const { vectorSearchLocal } = await import('../../services/search/vectorSearch.js')
    const results = await vectorSearchLocal([1, 0], {}, 1)

    expect(chainEmbedding.select).toHaveBeenCalledWith('_id embedding')
    expect(chainHydrate.select).toHaveBeenCalledWith(
      expect.not.stringContaining('embedding')
    )
    expect(results).toHaveLength(1)
    expect(results[0].name).toBe('Alpha')
    expect(results[0].embedding).toBeUndefined()
  })
})

describe('vectorSearch', () => {
  beforeEach(() => {
    mockFind.mockReset()
    mockAggregate.mockReset()
    vi.resetModules()
  })

  it('prefers Atlas $vectorSearch on mongodb+srv URLs', async () => {
    vi.doMock('../../config/env.js', () => ({
      config: {
        db: { mongoUrl: 'mongodb+srv://cluster.example.net/shop' },
        search: {
          vectorIndex: 'product_vector_index',
          vectorCandidates: 100,
        },
      },
    }))

    mockAggregate.mockResolvedValue([{ _id: '1', name: 'Atlas Hit' }])

    const { vectorSearch } = await import('../../services/search/vectorSearch.js')
    const results = await vectorSearch([0.1, 0.2], {}, 5)

    expect(mockAggregate).toHaveBeenCalled()
    expect(mockFind).not.toHaveBeenCalled()
    expect(results[0].name).toBe('Atlas Hit')
  })
})
