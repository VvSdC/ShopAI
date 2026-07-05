import express from 'express'
import catetgoryFileUpload from '../config/categoryUpload.js'
import {
  createCategoryCtrl,
  getAllCategoriesCtrl,
  getSingleCategoryCtrl,
  updateCategoryCtrl,
  deleteCategoryCtrl,
} from '../controllers/categoriesCtrl.js'
import { isLoggedIn } from '../middlewares/isLoggedin.js'
import isAdmin from '../middlewares/isAdmin.js'
import { validateObjectId } from '../middlewares/validateObjectId.js'

const categoriesRouter = express.Router()

categoriesRouter.post(
  '/',
  isLoggedIn,
  isAdmin,
  catetgoryFileUpload.single('file'),
  createCategoryCtrl
)
categoriesRouter.get('/', getAllCategoriesCtrl)
categoriesRouter.get('/:id', validateObjectId('id'), getSingleCategoryCtrl)
categoriesRouter.delete('/:id', isLoggedIn, isAdmin, validateObjectId('id'), deleteCategoryCtrl)
categoriesRouter.put(
  '/:id',
  isLoggedIn,
  isAdmin,
  validateObjectId('id'),
  catetgoryFileUpload.single('file'),
  updateCategoryCtrl
)
export default categoriesRouter
