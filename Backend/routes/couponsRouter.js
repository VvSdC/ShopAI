import express from 'express'
import {
  createCouponCtrl,
  getAllCouponsCtrl,
  getCouponCtrl,
  updateCouponCtrl,
  deleteCouponCtrl,
} from '../controllers/couponsCtrl.js'
import isAdmin from '../middlewares/isAdmin.js'
import { isLoggedIn } from '../middlewares/isLoggedin.js'

const couponsRouter = express.Router()

couponsRouter.post('/', isLoggedIn, isAdmin, createCouponCtrl)

couponsRouter.get('/', getAllCouponsCtrl)
couponsRouter.put('/update/:id', isLoggedIn, isAdmin, updateCouponCtrl)
couponsRouter.delete('/delete/:id', isLoggedIn, isAdmin, deleteCouponCtrl)
couponsRouter.get('/single', getCouponCtrl)
export default couponsRouter
