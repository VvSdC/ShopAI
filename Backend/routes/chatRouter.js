import express from 'express'
import { chatMessageCtrl } from '../controllers/chatCtrl.js'
import {
  listChatSessionsCtrl,
  getChatSessionCtrl,
  getChatSessionMessagesCtrl,
  createChatSessionCtrl,
  deleteChatSessionCtrl,
} from '../controllers/chatSessionCtrl.js'
import { isLoggedIn } from '../middlewares/isLoggedin.js'
import { validate } from '../middlewares/validate.js'
import { chatMessageSchema } from '../validations/chatSchemas.js'

const chatRouter = express.Router()

chatRouter.get('/sessions', isLoggedIn, listChatSessionsCtrl)
chatRouter.post('/sessions', isLoggedIn, createChatSessionCtrl)
chatRouter.get('/sessions/:id/messages', isLoggedIn, getChatSessionMessagesCtrl)
chatRouter.get('/sessions/:id', isLoggedIn, getChatSessionCtrl)
chatRouter.delete('/sessions/:id', isLoggedIn, deleteChatSessionCtrl)
chatRouter.post('/message', isLoggedIn, validate(chatMessageSchema), chatMessageCtrl)

export default chatRouter
