import multer from 'multer'
import { CloudinaryStorage } from 'multer-storage-cloudinary'
import { getCloudinary } from './cloudinaryClient.js'

const storage = new CloudinaryStorage({
  cloudinary: getCloudinary(),
  allowedFormats: ['jpg', 'png', 'jpeg'],
  params: {
    folder: 'category-api',
  },
})

// Init Multer with the storage engine
// add a fileSize limit consistent with other uploads
const catetgoryFileUpload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } })

export default catetgoryFileUpload
