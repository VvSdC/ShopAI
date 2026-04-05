import express from 'express'
import {
  createOrderCtrl,
  getAllordersCtrl,
  getSingleOrderCtrl,
  updateOrderCtrl,
  getOrderStatsCtrl,
  verifyPaymentCtrl,
} from '../controllers/orderCtrl.js'
import { isLoggedIn } from '../middlewares/isLoggedin.js'
import isAdmin from '../middlewares/isAdmin.js'

const orderRouter = express.Router()

orderRouter.post('/', isLoggedIn, createOrderCtrl)
orderRouter.get('/', isLoggedIn, isAdmin, getAllordersCtrl)
orderRouter.get('/sales/stats', isLoggedIn, isAdmin, getOrderStatsCtrl)
orderRouter.get('/verify-payment/:session_id', isLoggedIn, verifyPaymentCtrl)
orderRouter.put('/update/:id', isLoggedIn, isAdmin, updateOrderCtrl)
orderRouter.get('/:id', isLoggedIn, getSingleOrderCtrl)

export default orderRouter
