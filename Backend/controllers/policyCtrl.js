import asyncHandler from 'express-async-handler'
import { STORE_POLICY } from '../config/storePolicy.js'
import { RETURN_REASONS } from '../constants/returnReasons.js'

export const getPublicPolicyCtrl = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    policy: STORE_POLICY,
    returnReasons: RETURN_REASONS,
  })
})
