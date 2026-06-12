import asyncHandler from 'express-async-handler'
import User from '../model/User.js'
import {
  listInferenceProviders,
  testInferenceProvider,
} from '../services/inferenceTestService.js'
import {
  listChatEvalCases,
  runChatEvalSuite,
} from '../services/chatEvalService.js'
import {
  createChatEvalJob,
  getChatEvalJob,
  patchChatEvalJob,
  publicChatEvalJob,
} from '../services/chatEvalJobStore.js'
import { getChatUsageAnalytics } from '../services/llmUsageAnalytics.js'
import { runWithLlmUsageContext } from '../services/llmUsageContext.js'

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
    res.status(401)
    throw new Error('User not found')
  }

  const job = await createChatEvalJob(req.userAuthId)
  res.status(202).json({ success: true, jobId: job.id })

  ;(async () => {
    try {
      await patchChatEvalJob(job.id, { status: 'running' })

      const payload = await runWithLlmUsageContext(
        { source: 'eval', userId: req.userAuthId },
        () =>
          runChatEvalSuite(
            req.userAuthId,
            user.fullname || 'Admin',
            Array.isArray(caseIds) && caseIds.length ? caseIds : null,
            (progress) => patchChatEvalJob(job.id, progress)
          )
      )

      await patchChatEvalJob(job.id, {
        status: 'completed',
        total: payload.results.length,
        completed: payload.results.length,
        currentCase: null,
        results: payload.results,
        summary: payload.summary,
        finishedAt: new Date().toISOString(),
      })
    } catch (err) {
      await patchChatEvalJob(job.id, {
        status: 'failed',
        error: err.message || 'Evaluation run failed',
        finishedAt: new Date().toISOString(),
      })
    }
  })()
})

export const getChatEvalStatusCtrl = asyncHandler(async (req, res) => {
  const job = await getChatEvalJob(req.params.jobId, req.userAuthId)
  if (!job) {
    res.status(404)
    throw new Error('Evaluation job not found')
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
