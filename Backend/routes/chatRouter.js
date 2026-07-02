import express from 'express'
import { chatMessageCtrl, chatMessageStreamCtrl, guestChatMessageStreamCtrl } from '../controllers/chatCtrl.js'
import {
  listChatSessionsCtrl,
  getChatSessionCtrl,
  getChatSessionMessagesCtrl,
  createChatSessionCtrl,
  deleteChatSessionCtrl,
} from '../controllers/chatSessionCtrl.js'
import { isLoggedIn } from '../middlewares/isLoggedin.js'
import { validate } from '../middlewares/validate.js'
import { chatMessageSchema, guestChatMessageSchema } from '../validations/chatSchemas.js'
import { chatUserLimiter, chatUserDailyLimiter, chatGuestLimiter, chatGuestDailyLimiter } from '../config/rateLimiters.js'

const chatRouter = express.Router()

const chatMessageLimits = [chatUserLimiter, chatUserDailyLimiter]
const guestChatMessageLimits = [chatGuestLimiter, chatGuestDailyLimiter]

chatRouter.get('/sessions', isLoggedIn, listChatSessionsCtrl)
chatRouter.post('/sessions', isLoggedIn, createChatSessionCtrl)
chatRouter.get('/sessions/:id/messages', isLoggedIn, getChatSessionMessagesCtrl)
chatRouter.get('/sessions/:id', isLoggedIn, getChatSessionCtrl)
chatRouter.delete('/sessions/:id', isLoggedIn, deleteChatSessionCtrl)
chatRouter.post(
  '/message',
  isLoggedIn,
  ...chatMessageLimits,
  validate(chatMessageSchema),
  chatMessageCtrl
)
chatRouter.post(
  '/message/stream',
  isLoggedIn,
  ...chatMessageLimits,
  validate(chatMessageSchema),
  chatMessageStreamCtrl
)

chatRouter.post(
  '/guest/message/stream',
  ...guestChatMessageLimits,
  validate(guestChatMessageSchema),
  guestChatMessageStreamCtrl
)

export default chatRouter
