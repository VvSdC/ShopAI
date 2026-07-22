import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('cloudinaryPublicIdFromUrl', () => {
  it('extracts folder/public_id from a standard delivery URL', async () => {
    const { cloudinaryPublicIdFromUrl } = await import('../../utils/cloudinaryAssets.js')
    expect(
      cloudinaryPublicIdFromUrl(
        'https://res.cloudinary.com/demo/image/upload/v1690000000/Ecommerce-api/abc123.jpg'
      )
    ).toBe('Ecommerce-api/abc123')
  })

  it('strips transformation segments', async () => {
    const { cloudinaryPublicIdFromUrl } = await import('../../utils/cloudinaryAssets.js')
    expect(
      cloudinaryPublicIdFromUrl(
        'https://res.cloudinary.com/demo/image/upload/w_900,h_900,c_limit,q_auto:good,f_auto/v1/Ecommerce-api/shirt.png'
      )
    ).toBe('Ecommerce-api/shirt')
  })

  it('returns null for non-cloudinary or empty values', async () => {
    const { cloudinaryPublicIdFromUrl } = await import('../../utils/cloudinaryAssets.js')
    expect(cloudinaryPublicIdFromUrl('')).toBeNull()
    expect(cloudinaryPublicIdFromUrl(null)).toBeNull()
    expect(cloudinaryPublicIdFromUrl('https://example.com/img.jpg')).toBeNull()
  })
})

describe('destroyCloudinaryImages', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('destroys each unique public_id via uploader.destroy', async () => {
    const destroy = vi.fn(async () => ({ result: 'ok' }))
    vi.doMock('../../config/cloudinaryClient.js', () => ({
      hasCloudinaryConfigured: () => true,
      getCloudinary: () => ({ uploader: { destroy } }),
    }))

    const { destroyCloudinaryImages } = await import('../../utils/cloudinaryAssets.js')
    await destroyCloudinaryImages([
      'https://res.cloudinary.com/demo/image/upload/v1/Ecommerce-api/a.jpg',
      'https://res.cloudinary.com/demo/image/upload/v1/Ecommerce-api/a.jpg',
      'https://res.cloudinary.com/demo/image/upload/v1/Ecommerce-api/b.png',
    ])

    expect(destroy).toHaveBeenCalledTimes(2)
    expect(destroy).toHaveBeenCalledWith('Ecommerce-api/a')
    expect(destroy).toHaveBeenCalledWith('Ecommerce-api/b')
  })

  it('no-ops when Cloudinary is not configured', async () => {
    const destroy = vi.fn()
    vi.doMock('../../config/cloudinaryClient.js', () => ({
      hasCloudinaryConfigured: () => false,
      getCloudinary: () => ({ uploader: { destroy } }),
    }))

    const { destroyCloudinaryImages } = await import('../../utils/cloudinaryAssets.js')
    await destroyCloudinaryImages([
      'https://res.cloudinary.com/demo/image/upload/v1/Ecommerce-api/a.jpg',
    ])
    expect(destroy).not.toHaveBeenCalled()
  })

  it('continues when destroy fails for one asset', async () => {
    const destroy = vi
      .fn()
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce({ result: 'ok' })
    vi.doMock('../../config/cloudinaryClient.js', () => ({
      hasCloudinaryConfigured: () => true,
      getCloudinary: () => ({ uploader: { destroy } }),
    }))

    const { destroyCloudinaryImages } = await import('../../utils/cloudinaryAssets.js')
    await expect(
      destroyCloudinaryImages([
        'https://res.cloudinary.com/demo/image/upload/v1/Ecommerce-api/a.jpg',
        'https://res.cloudinary.com/demo/image/upload/v1/Ecommerce-api/b.jpg',
      ])
    ).resolves.toBeUndefined()
    expect(destroy).toHaveBeenCalledTimes(2)
  })
})
