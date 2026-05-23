import express from 'express'
import {
  createOrderCtrl,
  getAllordersCtrl,
  getSingleOrderCtrl,
  updateOrderCtrl,
  getOrderStatsCtrl,
  verifyPaymentCtrl,
  resendConfirmationCtrl,
  getUserOrdersCtrl,
  cancelOrderCtrl,
} from '../controllers/orderCtrl.js'
import { isLoggedIn } from '../middlewares/isLoggedin.js'
import isAdmin from '../middlewares/isAdmin.js'
import { validate } from '../middlewares/validate.js'
import { createOrderSchema } from '../validations/orderSchemas.js'

const orderRouter = express.Router()

orderRouter.post('/', isLoggedIn, validate(createOrderSchema), createOrderCtrl)
orderRouter.get('/', isLoggedIn, isAdmin, getAllordersCtrl)
orderRouter.get('/sales/stats', isLoggedIn, isAdmin, getOrderStatsCtrl)
orderRouter.get('/my-orders', isLoggedIn, getUserOrdersCtrl)
orderRouter.get('/verify-payment/:session_id', isLoggedIn, verifyPaymentCtrl)
orderRouter.post(
  '/resend-confirmation/:session_id',
  isLoggedIn,
  resendConfirmationCtrl
)
orderRouter.put('/cancel/:id', isLoggedIn, cancelOrderCtrl)
orderRouter.put('/update/:id', isLoggedIn, isAdmin, updateOrderCtrl)
orderRouter.get('/:id', isLoggedIn, getSingleOrderCtrl)

export default orderRouter
