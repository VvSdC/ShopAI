import express from 'express'
import { chatMessageCtrl } from '../controllers/chatCtrl.js'
import { isLoggedIn } from '../middlewares/isLoggedin.js'

const chatRouter = express.Router()

chatRouter.post('/message', isLoggedIn, chatMessageCtrl)

export default chatRouter
