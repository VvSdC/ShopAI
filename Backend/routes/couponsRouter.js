import express from 'express'
import {
  createCouponCtrl,
  getAllCouponsCtrl,
  getCouponCtrl,
  updateCouponCtrl,
  deleteCouponCtrl,
  getActiveCouponCtrl,
} from '../controllers/couponsCtrl.js'
import isAdmin from '../middlewares/isAdmin.js'
import { isLoggedIn } from '../middlewares/isLoggedin.js'
import { validateObjectId } from '../middlewares/validateObjectId.js'

const couponsRouter = express.Router()

couponsRouter.post('/', isLoggedIn, isAdmin, createCouponCtrl)
couponsRouter.get('/active', getActiveCouponCtrl)
couponsRouter.get('/single', getCouponCtrl)
couponsRouter.get('/', isLoggedIn, isAdmin, getAllCouponsCtrl)
couponsRouter.put('/update/:id', isLoggedIn, isAdmin, validateObjectId('id'), updateCouponCtrl)
couponsRouter.delete('/delete/:id', isLoggedIn, isAdmin, validateObjectId('id'), deleteCouponCtrl)
export default couponsRouter
