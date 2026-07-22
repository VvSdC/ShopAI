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
  pollPaymentStatusCtrl,
  expireCheckoutCtrl,
} from '../controllers/orderCtrl.js'
import { isLoggedIn } from '../middlewares/isLoggedin.js'
import isAdmin from '../middlewares/isAdmin.js'
import { validate } from '../middlewares/validate.js'
import { validateObjectId } from '../middlewares/validateObjectId.js'
import { createOrderSchema, updateOrderStatusSchema } from '../validations/orderSchemas.js'

const orderRouter = express.Router()

orderRouter.post('/', isLoggedIn, validate(createOrderSchema), createOrderCtrl)
orderRouter.get('/', isLoggedIn, isAdmin, getAllordersCtrl)
orderRouter.get('/sales/stats', isLoggedIn, isAdmin, getOrderStatsCtrl)
orderRouter.get('/my-orders', isLoggedIn, getUserOrdersCtrl)
orderRouter.get('/verify-payment/:session_id', isLoggedIn, verifyPaymentCtrl)
orderRouter.get('/payment-status/:orderId', isLoggedIn, validateObjectId('orderId'), pollPaymentStatusCtrl)
orderRouter.post('/expire-checkout/:orderId', isLoggedIn, validateObjectId('orderId'), expireCheckoutCtrl)
orderRouter.post(
  '/resend-confirmation/:session_id',
  isLoggedIn,
  resendConfirmationCtrl
)
orderRouter.put('/cancel/:id', isLoggedIn, validateObjectId('id'), cancelOrderCtrl)
orderRouter.put('/update/:id', isLoggedIn, isAdmin, validateObjectId('id'), validate(updateOrderStatusSchema), updateOrderCtrl)
orderRouter.get('/:id', isLoggedIn, validateObjectId('id'), getSingleOrderCtrl)

export default orderRouter
