import express from 'express'
import { isLoggedIn } from '../middlewares/isLoggedin.js'
import isAdmin from '../middlewares/isAdmin.js'
import {
  listInferenceProvidersCtrl,
  testInferenceProviderCtrl,
} from '../controllers/analyticsCtrl.js'

const analyticsRouter = express.Router()

analyticsRouter.get(
  '/inference/providers',
  isLoggedIn,
  isAdmin,
  listInferenceProvidersCtrl
)
analyticsRouter.post(
  '/inference/test',
  isLoggedIn,
  isAdmin,
  testInferenceProviderCtrl
)

export default analyticsRouter
