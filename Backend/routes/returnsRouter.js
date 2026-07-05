import express from 'express'
import {
  getReturnReasonsCtrl,
  getMyReturnsCtrl,
  getOrderReturnEligibilityCtrl,
  createReturnCtrl,
  listAllReturnsCtrl,
  approveReturnCtrl,
  rejectReturnCtrl,
  getReturnStatsCtrl,
} from '../controllers/returnCtrl.js'
import { isLoggedIn } from '../middlewares/isLoggedin.js'
import isAdmin from '../middlewares/isAdmin.js'
import { validate } from '../middlewares/validate.js'
import { validateObjectId } from '../middlewares/validateObjectId.js'
import {
  createReturnSchema,
  rejectReturnSchema,
  approveReturnSchema,
} from '../validations/returnSchemas.js'

const returnsRouter = express.Router()

returnsRouter.get('/reasons', getReturnReasonsCtrl)
returnsRouter.get('/my', isLoggedIn, getMyReturnsCtrl)
returnsRouter.get('/stats', isLoggedIn, isAdmin, getReturnStatsCtrl)
returnsRouter.get('/admin/all', isLoggedIn, isAdmin, listAllReturnsCtrl)
returnsRouter.get('/eligibility/:orderId', isLoggedIn, validateObjectId('orderId'), getOrderReturnEligibilityCtrl)
returnsRouter.post(
  '/:orderId',
  isLoggedIn,
  validateObjectId('orderId'),
  validate(createReturnSchema),
  createReturnCtrl
)
returnsRouter.put(
  '/:id/approve',
  isLoggedIn,
  isAdmin,
  validateObjectId('id'),
  validate(approveReturnSchema),
  approveReturnCtrl
)
returnsRouter.put(
  '/:id/reject',
  isLoggedIn,
  isAdmin,
  validateObjectId('id'),
  validate(rejectReturnSchema),
  rejectReturnCtrl
)

export default returnsRouter
