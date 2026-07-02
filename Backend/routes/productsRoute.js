import express from 'express'
import upload from '../config/fileUpload.js'
import {
  createProductCtrl,
  getProductsCtrl,
  getMyProductsCtrl,
  getProductCtrl,
  getSimilarProductsCtrl,
  updateProductCtrl,
  deleteProductCtrl,
  validateCartCtrl,
} from '../controllers/productsCtrl.js'
import isAdmin from '../middlewares/isAdmin.js'
import { isLoggedIn } from '../middlewares/isLoggedin.js'

const productsRouter = express.Router()

productsRouter.post(
  '/',
  isLoggedIn,
  isAdmin,
  upload.array('files'),
  createProductCtrl
)

productsRouter.post('/validate-cart', validateCartCtrl)
productsRouter.get('/mine', isLoggedIn, isAdmin, getMyProductsCtrl)
productsRouter.get('/', getProductsCtrl)
productsRouter.get('/:id/similar', getSimilarProductsCtrl)
productsRouter.get('/:id', getProductCtrl)
productsRouter.put('/:id', isLoggedIn, isAdmin, upload.array('files'), updateProductCtrl)
productsRouter.delete('/:id/delete', isLoggedIn, isAdmin, deleteProductCtrl)
export default productsRouter
