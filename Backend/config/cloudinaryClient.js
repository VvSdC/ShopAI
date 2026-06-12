import cloudinaryPackage from 'cloudinary'
import { config } from './env.js'

const cloudinary = cloudinaryPackage.v2
let configured = false

export function hasCloudinaryConfigured() {
  return Boolean(
    config.cloudinary.cloudName &&
      config.cloudinary.apiKey &&
      config.cloudinary.apiSecret
  )
}

/** Lazy Cloudinary client — uses centralized config, not raw process.env. */
export function getCloudinary() {
  if (!configured) {
    cloudinary.config({
      cloud_name: config.cloudinary.cloudName,
      api_key: config.cloudinary.apiKey,
      api_secret: config.cloudinary.apiSecret,
    })
    configured = true
  }
  return cloudinary
}
