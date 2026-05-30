import express from 'express'
import { getPublicPolicyCtrl } from '../controllers/policyCtrl.js'

const policyRouter = express.Router()

policyRouter.get('/', getPublicPolicyCtrl)

export default policyRouter
