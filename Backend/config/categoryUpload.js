import cloudinaryPackage from 'cloudinary'

import multer from 'multer'
import { CloudinaryStorage } from 'multer-storage-cloudinary'

//configure cloudinary
const cloudinary = cloudinaryPackage.v2
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET_KEY,
})

// Create storage engine for Multer
const storage = new CloudinaryStorage({
  cloudinary,
  allowedFormats: ['jpg', 'png', 'jpeg'],
  params: {
    folder: 'category-api',
  },
})

// Init Multer with the storage engine
// add a fileSize limit consistent with other uploads
const catetgoryFileUpload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } })

export default catetgoryFileUpload
