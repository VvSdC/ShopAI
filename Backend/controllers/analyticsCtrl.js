import asyncHandler from 'express-async-handler'
import {
  listInferenceProviders,
  testInferenceProvider,
} from '../services/inferenceTestService.js'

export const listInferenceProvidersCtrl = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    providers: listInferenceProviders(),
  })
})

export const testInferenceProviderCtrl = asyncHandler(async (req, res) => {
  const { providerId, model } = req.body || {}

  if (!providerId || typeof providerId !== 'string') {
    res.status(400)
    throw new Error('providerId is required')
  }

  const result = await testInferenceProvider(providerId, model)
  res.json({ success: true, ...result })
})
