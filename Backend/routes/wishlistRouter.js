import express from 'express'
import { isLoggedIn } from '../middlewares/isLoggedin.js'
import { validate } from '../middlewares/validate.js'
import {
  getWishlistCtrl,
  addWishlistItemCtrl,
  removeWishlistItemCtrl,
  syncWishlistCtrl,
} from '../controllers/wishlistCtrl.js'
import {
  wishlistProductSchema,
  syncWishlistSchema,
} from '../validations/wishlistSchemas.js'

const wishlistRouter = express.Router()

wishlistRouter.get('/', isLoggedIn, getWishlistCtrl)
wishlistRouter.post('/items', isLoggedIn, validate(wishlistProductSchema), addWishlistItemCtrl)
wishlistRouter.delete('/items', isLoggedIn, validate(wishlistProductSchema), removeWishlistItemCtrl)
wishlistRouter.post('/sync', isLoggedIn, validate(syncWishlistSchema), syncWishlistCtrl)

export default wishlistRouter
