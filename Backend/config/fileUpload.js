import multer from 'multer'
import { CloudinaryStorage } from 'multer-storage-cloudinary'
import { getCloudinary } from './cloudinaryClient.js'

const storage = new CloudinaryStorage({
  cloudinary: getCloudinary(),
  allowedFormats: ['jpg', 'png', 'jpeg'],
  params: {
    folder: 'Ecommerce-api',
  },
})

// Init Multer with the storage engine and a sensible file size limit (5MB)
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
})

export default upload
