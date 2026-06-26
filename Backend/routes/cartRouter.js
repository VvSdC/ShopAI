import express from 'express'
import { isLoggedIn } from '../middlewares/isLoggedin.js'
import { validate } from '../middlewares/validate.js'
import {
  getCartCtrl,
  addCartItemCtrl,
  updateCartItemCtrl,
  removeCartItemCtrl,
  applyCartCouponCtrl,
  removeCartCouponCtrl,
  syncCartCtrl,
  validateServerCartCtrl,
  clearCartCtrl,
} from '../controllers/cartCtrl.js'
import {
  addCartItemSchema,
  updateCartItemSchema,
  removeCartItemSchema,
  applyCartCouponSchema,
  syncCartSchema,
} from '../validations/cartSchemas.js'

const cartRouter = express.Router()

cartRouter.get('/', isLoggedIn, getCartCtrl)
cartRouter.delete('/', isLoggedIn, clearCartCtrl)
cartRouter.post('/items', isLoggedIn, validate(addCartItemSchema), addCartItemCtrl)
cartRouter.patch('/items', isLoggedIn, validate(updateCartItemSchema), updateCartItemCtrl)
cartRouter.delete('/items', isLoggedIn, validate(removeCartItemSchema), removeCartItemCtrl)
cartRouter.post('/coupon', isLoggedIn, validate(applyCartCouponSchema), applyCartCouponCtrl)
cartRouter.delete('/coupon', isLoggedIn, removeCartCouponCtrl)
cartRouter.post('/sync', isLoggedIn, validate(syncCartSchema), syncCartCtrl)
cartRouter.post('/validate', isLoggedIn, validateServerCartCtrl)

export default cartRouter
