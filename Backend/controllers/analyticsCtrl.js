import asyncHandler from 'express-async-handler'
import User from '../model/User.js'
import { AppError } from '../utils/appError.js'
import {
  listInferenceProviders,
  testInferenceProvider,
} from '../services/inferenceTestService.js'
import { listChatEvalCases } from '../services/chatEvalService.js'
import {
  createChatEvalJob,
  getChatEvalJob,
  publicChatEvalJob,
} from '../services/chatEvalJobStore.js'
import { scheduleChatEvalJob } from '../services/chatEvalQueue.js'
import { getChatUsageAnalytics } from '../services/llmUsageAnalytics.js'

export const listInferenceProvidersCtrl = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    providers: listInferenceProviders(),
  })
})

export const testInferenceProviderCtrl = asyncHandler(async (req, res) => {
  const { providerId, model } = req.body || {}

  if (!providerId || typeof providerId !== 'string') {
    throw new AppError('providerId is required', 400)
  }

  const result = await testInferenceProvider(providerId, model)
  res.json({ success: true, ...result })
})

export const listChatEvalCasesCtrl = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    cases: listChatEvalCases(),
  })
})

export const runChatEvalCtrl = asyncHandler(async (req, res) => {
  const { caseIds } = req.body || {}
  const user = await User.findById(req.userAuthId).select('fullname')
  if (!user) {
    throw new AppError('User not found', 401)
  }

  const job = await createChatEvalJob(req.userAuthId)
  res.status(202).json({ success: true, jobId: job.id })

  scheduleChatEvalJob({
    jobId: job.id,
    userId: req.userAuthId,
    userName: user.fullname || 'Admin',
    caseIds: Array.isArray(caseIds) && caseIds.length ? caseIds : null,
  })
})

export const getChatEvalStatusCtrl = asyncHandler(async (req, res) => {
  const job = await getChatEvalJob(req.params.jobId, req.userAuthId)
  if (!job) {
    throw new AppError('Evaluation job not found', 404)
  }

  res.json({
    success: true,
    job: publicChatEvalJob(job),
  })
})

export const getChatUsageCtrl = asyncHandler(async (req, res) => {
  const days = parseInt(req.query.days, 10) || 7
  const source = typeof req.query.source === 'string' ? req.query.source : 'chat'

  const analytics = await getChatUsageAnalytics({ days, source })
  res.json({ success: true, ...analytics })
})
