import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('cloudinaryClient', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('reports unconfigured when cloudinary secrets are missing', async () => {
    vi.doMock('../../config/env.js', () => ({
      config: {
        cloudinary: { cloudName: '', apiKey: '', apiSecret: '' },
      },
    }))

    const { hasCloudinaryConfigured } = await import('../../config/cloudinaryClient.js')
    expect(hasCloudinaryConfigured()).toBe(false)
  })

  it('returns a lazy singleton configured from config.cloudinary', async () => {
    vi.doMock('../../config/env.js', () => ({
      config: {
        cloudinary: {
          cloudName: 'test-cloud',
          apiKey: 'test-key',
          apiSecret: 'test-secret',
        },
      },
    }))

    const { getCloudinary } = await import('../../config/cloudinaryClient.js')
    const a = getCloudinary()
    const b = getCloudinary()
    expect(a).toBe(b)
    expect(a.config().cloud_name).toBe('test-cloud')
  })
})
