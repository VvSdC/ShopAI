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
    const results = await vectorSearchLocal([1, 0], { brand: 'Acme' }, 1)

    expect(chainEmbedding.select).toHaveBeenCalledWith('_id embedding')
    expect(chainEmbedding.limit).toHaveBeenCalledWith(4)
    expect(chainHydrate.select).toHaveBeenCalledWith(
      expect.not.stringContaining('embedding')
    )
    expect(results).toHaveLength(1)
    expect(results[0].name).toBe('Alpha')
    expect(results[0].embedding).toBeUndefined()
  })

  it('samples candidates when no catalog pre-filter is present', async () => {
    const idA = '507f1f77bcf86cd799439011'

    mockAggregate.mockResolvedValue([{ _id: idA, embedding: [1, 0] }])

    const chainHydrate = {
      select: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([{ _id: idA, name: 'Sampled' }]),
    }
    mockFind.mockReturnValueOnce(chainHydrate)

    const { vectorSearchLocal } = await import('../../services/search/vectorSearch.js')
    const results = await vectorSearchLocal([1, 0], {}, 1)

    expect(mockAggregate).toHaveBeenCalledWith([
      { $match: { embedding: { $exists: true, $ne: [] } } },
      { $sample: { size: 4 } },
      { $project: { _id: 1, embedding: 1 } },
    ])
    expect(mockFind).toHaveBeenCalledTimes(1)
    expect(results[0].name).toBe('Sampled')
  })

  it('caps local candidates at SEARCH_LOCAL_VECTOR_CAP', async () => {
    vi.resetModules()
    vi.doMock('../../config/env.js', () => ({
      config: {
        db: { mongoUrl: 'mongodb://127.0.0.1:27017/shop' },
        search: {
          vectorCandidates: 2000,
          localVectorCandidateCap: 100,
          vectorIndex: 'product_vector_index',
        },
      },
    }))

    mockAggregate.mockResolvedValue([])

    const { vectorSearchLocal } = await import('../../services/search/vectorSearch.js')
    await vectorSearchLocal([1, 0], {}, 200)

    expect(mockAggregate).toHaveBeenCalledWith([
      { $match: { embedding: { $exists: true, $ne: [] } } },
      { $sample: { size: 100 } },
      { $project: { _id: 1, embedding: 1 } },
    ])
  })
})

describe('vectorSearch', () => {
  beforeEach(() => {
    mockFind.mockReset()
    mockAggregate.mockReset()
    vi.resetModules()
  })

  it('prefers Atlas $vectorSearch when VECTOR_SEARCH_BACKEND=auto and URL is +srv', async () => {
    vi.doMock('../../config/env.js', () => ({
      config: {
        db: { mongoUrl: 'mongodb+srv://cluster.example.net/shop' },
        search: {
          vectorBackend: 'auto',
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

  it('uses Atlas when VECTOR_SEARCH_BACKEND=atlas even without +srv URL', async () => {
    vi.doMock('../../config/env.js', () => ({
      config: {
        db: { mongoUrl: 'mongodb://user:pass@atlas-host:27017/shop' },
        search: {
          vectorBackend: 'atlas',
          vectorIndex: 'product_vector_index',
          vectorCandidates: 100,
        },
      },
    }))

    mockAggregate.mockResolvedValue([{ _id: '1', name: 'Atlas Hit' }])

    const { vectorSearch } = await import('../../services/search/vectorSearch.js')
    const results = await vectorSearch([0.1, 0.2], {}, 5)

    expect(mockAggregate).toHaveBeenCalled()
    expect(results[0].name).toBe('Atlas Hit')
  })

  it('skips Atlas when VECTOR_SEARCH_BACKEND=local even with +srv URL', async () => {
    vi.doMock('../../config/env.js', () => ({
      config: {
        db: { mongoUrl: 'mongodb+srv://cluster.example.net/shop' },
        search: {
          vectorBackend: 'local',
          vectorCandidates: 100,
          localVectorCandidateCap: 100,
        },
      },
    }))

    mockAggregate.mockResolvedValue([])

    const chainEmbedding = {
      select: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([]),
    }
    mockFind.mockReturnValue(chainEmbedding)

    const { vectorSearch } = await import('../../services/search/vectorSearch.js')
    await vectorSearch([0.1, 0.2], { brand: 'Acme' }, 5)

    const atlasPipeline = mockAggregate.mock.calls.find((call) =>
      call[0]?.[0]?.$vectorSearch
    )
    expect(atlasPipeline).toBeUndefined()
    expect(mockFind).toHaveBeenCalled()
  })
})
