import { describe, it, expect, vi, beforeEach } from 'vitest'

const findOneMock = vi.fn()
const countDocumentsMock = vi.fn()

vi.mock('../../model/Product.js', () => ({
  default: {
    findOne: (...args) => findOneMock(...args),
    countDocuments: (...args) => countDocumentsMock(...args),
    find: vi.fn(),
  },
}))

import {
  getEmbeddingSpec,
  getStoredEmbeddingDimension,
  productNeedsEmbedding,
  checkEmbeddingDimensionCompatibility,
  countEmbeddingDimensionMismatches,
} from '../../services/search/embeddingSyncService.js'

describe('embeddingSyncService dimension checks', () => {
  const spec = getEmbeddingSpec()

  it('reads stored dimension from embeddingDimension or vector length', () => {
    expect(getStoredEmbeddingDimension({ embedding: [1, 2, 3] })).toBe(3)
    expect(
      getStoredEmbeddingDimension({ embedding: [1, 2, 3, 4], embeddingDimension: 1024 })
    ).toBe(1024)
    expect(getStoredEmbeddingDimension({})).toBe(0)
  })

  it('flags products when embedding dimension differs from config', () => {
    expect(
      productNeedsEmbedding(
        {
          embedding: Array.from({ length: 768 }, () => 0.1),
          embeddedAt: new Date(),
          embeddingVersion: spec.version,
          embeddingModel: spec.model,
        },
        spec
      )
    ).toBe(spec.dimension !== 768)
  })

  it('accepts products when dimension matches config', () => {
    expect(
      productNeedsEmbedding(
        {
          embedding: Array.from({ length: spec.dimension }, () => 0.1),
          embeddedAt: new Date(),
          embeddingVersion: spec.version,
          embeddingModel: spec.model,
          embeddingDimension: spec.dimension,
        },
        spec
      )
    ).toBe(false)
  })
})

describe('checkEmbeddingDimensionCompatibility', () => {
  beforeEach(() => {
    findOneMock.mockReset()
    countDocumentsMock.mockReset()
  })

  it('reports compatible when sample matches configured dimension', async () => {
    const spec = getEmbeddingSpec()

    findOneMock.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue({
        embedding: Array.from({ length: spec.dimension }, () => 0.1),
        embeddingDimension: spec.dimension,
        embeddingVersion: spec.version,
        embeddingModel: spec.model,
      }),
    })
    countDocumentsMock.mockResolvedValue(0)

    const report = await checkEmbeddingDimensionCompatibility()

    expect(report.ok).toBe(true)
    expect(report.status).toBe('compatible')
    expect(report.expectedDim).toBe(spec.dimension)
  })

  it('reports mismatch with migration hint when dimensions differ', async () => {
    const spec = getEmbeddingSpec()

    findOneMock.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue({
        embedding: Array.from({ length: 768 }, () => 0.1),
        embeddingDimension: 768,
        embeddingVersion: 1,
        embeddingModel: 'old-model',
        embeddingProvider: 'huggingface',
      }),
    })
    countDocumentsMock.mockResolvedValue(12)

    const report = await checkEmbeddingDimensionCompatibility()

    if (spec.dimension === 768) {
      expect(report.ok).toBe(true)
      return
    }

    expect(report.ok).toBe(false)
    expect(report.status).toBe('dimension_mismatch')
    expect(report.storedDim).toBe(768)
    expect(report.mismatchCount).toBe(12)
    expect(report.migration).toContain('search:reindex')
  })

  it('counts mismatched products via stored dimension or vector length', async () => {
    countDocumentsMock.mockResolvedValue(3)

    const count = await countEmbeddingDimensionMismatches(1024)

    expect(count).toBe(3)
    expect(countDocumentsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        $or: expect.arrayContaining([
          { embeddingDimension: { $exists: true, $ne: 1024 } },
          expect.objectContaining({ $expr: expect.any(Object) }),
        ]),
      })
    )
  })
})
