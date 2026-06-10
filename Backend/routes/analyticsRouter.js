import express from 'express'
import { isLoggedIn } from '../middlewares/isLoggedin.js'
import isAdmin from '../middlewares/isAdmin.js'
import {
  listInferenceProvidersCtrl,
  testInferenceProviderCtrl,
  listChatEvalCasesCtrl,
  runChatEvalCtrl,
  getChatEvalStatusCtrl,
  getChatUsageCtrl,
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
analyticsRouter.get(
  '/chat-eval/cases',
  isLoggedIn,
  isAdmin,
  listChatEvalCasesCtrl
)
analyticsRouter.post('/chat-eval/run', isLoggedIn, isAdmin, runChatEvalCtrl)
analyticsRouter.get(
  '/chat-eval/status/:jobId',
  isLoggedIn,
  isAdmin,
  getChatEvalStatusCtrl
)
analyticsRouter.get('/chat-usage', isLoggedIn, isAdmin, getChatUsageCtrl)

export default analyticsRouter
