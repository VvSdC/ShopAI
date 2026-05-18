import express from 'express'
import { chatMessageCtrl } from '../controllers/chatCtrl.js'
import { isLoggedIn } from '../middlewares/isLoggedin.js'
import { validate } from '../middlewares/validate.js'
import { chatMessageSchema } from '../validations/chatSchemas.js'

const chatRouter = express.Router()

chatRouter.post('/message', isLoggedIn, validate(chatMessageSchema), chatMessageCtrl)

export default chatRouter
