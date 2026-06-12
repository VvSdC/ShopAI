import { describe, it, expect, beforeEach } from 'vitest'
import mongoose from 'mongoose'
import EvalJob from '../../model/EvalJob.js'
import User from '../../model/User.js'
import {
  createChatEvalJob,
  getChatEvalJob,
  patchChatEvalJob,
  publicChatEvalJob,
} from '../../services/chatEvalJobStore.js'

describe('chatEvalJobStore (MongoDB)', () => {
  let userId

  beforeEach(async () => {
    await EvalJob.deleteMany({})
    const user = await User.create({
      fullname: 'Eval Admin',
      email: `eval-admin-${Date.now()}@test.com`,
      password: 'hashed',
      isAdmin: true,
    })
    userId = user._id
  })

  it('creates and retrieves a job for the owning user', async () => {
    const job = await createChatEvalJob(userId)
    expect(job.id).toMatch(
      /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i
    )
    expect(job.status).toBe('queued')

    const loaded = await getChatEvalJob(job.id, userId)
    expect(loaded?.status).toBe('queued')
    expect(loaded?.userId).toBe(String(userId))
  })

  it('does not return jobs for other users', async () => {
    const job = await createChatEvalJob(userId)
    const otherId = new mongoose.Types.ObjectId()
    const loaded = await getChatEvalJob(job.id, otherId)
    expect(loaded).toBeNull()
  })

  it('persists patches across reloads', async () => {
    const job = await createChatEvalJob(userId)
    await patchChatEvalJob(job.id, {
      status: 'running',
      total: 2,
      completed: 1,
      currentCase: { id: 'case-1', category: 'cart', prompt: 'add bat' },
    })

    const loaded = await getChatEvalJob(job.id, userId)
    expect(loaded.status).toBe('running')
    expect(loaded.total).toBe(2)
    expect(loaded.completed).toBe(1)
    expect(loaded.currentCase.id).toBe('case-1')
  })

  it('stores completed results and summary', async () => {
    const job = await createChatEvalJob(userId)
    const results = [{ id: 'case-1', passed: true }]
    const summary = { total: 1, passed: 1, failed: 0, overallScore: 8 }

    await patchChatEvalJob(job.id, {
      status: 'completed',
      results,
      summary,
      finishedAt: new Date().toISOString(),
    })

    const publicJob = publicChatEvalJob(await getChatEvalJob(job.id, userId))
    expect(publicJob.status).toBe('completed')
    expect(publicJob.results).toEqual(results)
    expect(publicJob.summary).toEqual(summary)
    expect(publicJob.finishedAt).toBeTruthy()
  })

  it('trims oldest jobs when exceeding the cap', async () => {
    for (let i = 0; i < 22; i++) {
      await EvalJob.create({
        user: userId,
        jobId: `job-cap-${i}-${Date.now()}`,
        status: 'completed',
        startedAt: new Date(Date.now() - (22 - i) * 1000),
      })
    }

    expect(await EvalJob.countDocuments()).toBe(22)
    await createChatEvalJob(userId)
    expect(await EvalJob.countDocuments()).toBeLessThanOrEqual(20)
  })
})
