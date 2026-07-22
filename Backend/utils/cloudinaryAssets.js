import logger from './logger.js'
import { getCloudinary, hasCloudinaryConfigured } from '../config/cloudinaryClient.js'

/**
 * Extract Cloudinary public_id from a delivery URL.
 * Supports optional transforms and version segments:
 *   .../upload/v123/folder/file.jpg
 *   .../upload/w_100,h_100/v123/folder/file.jpg
 */
export function cloudinaryPublicIdFromUrl(url) {
  if (!url || typeof url !== 'string') return null
  if (!url.includes('/upload/')) return null

  const afterUpload = url.split('/upload/')[1]
  if (!afterUpload) return null

  let path = afterUpload.split('?')[0]
  // Drop trailing file extension from the last segment only.
  const segments = path.split('/').filter(Boolean)
  if (!segments.length) return null

  let start = 0
  // Transformation segment (e.g. w_900,h_900,c_limit or f_auto)
  if (segments[0].includes(',') || /^[a-z]+_/i.test(segments[0])) {
    start = 1
  }
  // Version segment (v1234567890)
  if (segments[start] && /^v\d+$/i.test(segments[start])) {
    start += 1
  }

  const publicPath = segments.slice(start).join('/')
  if (!publicPath) return null
  return publicPath.replace(/\.[^/.]+$/, '') || null
}

/**
 * Best-effort destroy of Cloudinary assets. Never throws — DB ops should proceed
 * even if remote cleanup fails.
 */
export async function destroyCloudinaryImages(urls = []) {
  const list = (Array.isArray(urls) ? urls : [urls]).filter(Boolean)
  if (!list.length || !hasCloudinaryConfigured()) return

  const cloudinary = getCloudinary()
  const publicIds = [
    ...new Set(list.map(cloudinaryPublicIdFromUrl).filter(Boolean)),
  ]

  await Promise.all(
    publicIds.map(async (publicId) => {
      try {
        await cloudinary.uploader.destroy(publicId)
      } catch (err) {
        logger.warn(
          `[cloudinary] Failed to destroy "${publicId}":`,
          err?.message || err
        )
      }
    })
  )
}
