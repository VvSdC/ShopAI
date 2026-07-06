import express from 'express'
import upload from '../config/fileUpload.js'
import {
  createProductCtrl,
  getProductsCtrl,
  getMyProductsCtrl,
  getProductSuggestionsCtrl,
  getProductCtrl,
  getSimilarProductsCtrl,
  updateProductCtrl,
  deleteProductCtrl,
  validateCartCtrl,
} from '../controllers/productsCtrl.js'
import isAdmin from '../middlewares/isAdmin.js'
import { isLoggedIn } from '../middlewares/isLoggedin.js'
import { validateObjectId } from '../middlewares/validateObjectId.js'
import { validateCartLimiter } from '../config/rateLimiters.js'

const productsRouter = express.Router()

productsRouter.post(
  '/',
  isLoggedIn,
  isAdmin,
  upload.array('files'),
  createProductCtrl
)

productsRouter.post('/validate-cart', validateCartLimiter, validateCartCtrl)
productsRouter.get('/mine', isLoggedIn, isAdmin, getMyProductsCtrl)
productsRouter.get('/suggestions', getProductSuggestionsCtrl)
productsRouter.get('/', getProductsCtrl)
productsRouter.get('/:id/similar', validateObjectId('id'), getSimilarProductsCtrl)
productsRouter.get('/:id', validateObjectId('id'), getProductCtrl)
productsRouter.put('/:id', isLoggedIn, isAdmin, validateObjectId('id'), upload.array('files'), updateProductCtrl)
productsRouter.delete('/:id/delete', isLoggedIn, isAdmin, validateObjectId('id'), deleteProductCtrl)
export default productsRouter
