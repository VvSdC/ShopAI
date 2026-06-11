import { describe, it, expect } from 'vitest'
import { productNeedsEmbedding, getEmbeddingSpec } from '../../services/search/embeddingSyncService.js'
import { isEmbeddingSyncQueueEnabled } from '../../services/search/embeddingSyncQueue.js'

describe('embeddingSyncQueue', () => {
  it('is disabled without Redis queue env', () => {
    expect(isEmbeddingSyncQueueEnabled()).toBe(false)
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
