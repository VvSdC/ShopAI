import { describe, it, expect, vi, beforeEach } from 'vitest'

const cacheGet = vi.fn()
const cacheSet = vi.fn()

vi.mock('../../services/cacheService.js', () => ({
  get: (...args) => cacheGet(...args),
  set: (...args) => cacheSet(...args),
}))

describe('embedSearchQuery', () => {
  beforeEach(() => {
    vi.resetModules()
    cacheGet.mockReset()
    cacheSet.mockReset()
  })

  it('returns cached query vectors without storing again', async () => {
    cacheGet.mockResolvedValue({
      vector: [0.1, 0.2],
      provider: 'HuggingFace',
      model: 'BAAI/bge-m3',
    })

    const { embedSearchQuery } = await import('../../services/search/embeddingService.js')
    const result = await embedSearchQuery('cricket bat')

    expect(result.cached).toBe(true)
    expect(result.vector).toEqual([0.1, 0.2])
    expect(cacheGet).toHaveBeenCalledOnce()
    expect(cacheSet).not.toHaveBeenCalled()
  })

  it('embeds and stores query vectors on cache miss', async () => {
    cacheGet.mockResolvedValue(null)
    cacheSet.mockResolvedValue(true)

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [[0.5, 0.6]],
    })

    const { embedSearchQuery } = await import('../../services/search/embeddingService.js')
    const result = await embedSearchQuery('running shoes')

    expect(result.cached).toBe(false)
    expect(result.vector).toEqual([0.5, 0.6])
    expect(cacheSet).toHaveBeenCalledOnce()
    expect(cacheSet.mock.calls[0][2]).toBe(3600)
    expect(global.fetch).toHaveBeenCalledOnce()
  })
})
