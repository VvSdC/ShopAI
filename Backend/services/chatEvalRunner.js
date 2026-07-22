import { runChatEvalSuite } from './chatEvalService.js'
import { patchChatEvalJob } from './chatEvalJobStore.js'
import { runWithLlmUsageContext } from './llmUsageContext.js'

/** Run one eval job and persist progress + terminal status to Mongo. */
export async function executeChatEvalJob({
  jobId,
  userId,
  userName,
  caseIds = null,
  onProgressExtra = null,
}) {
  const touchProgress = (progress) => {
    const patch = { ...progress, lastHeartbeatAt: new Date() }
    onProgressExtra?.(patch)
    return patchChatEvalJob(jobId, patch)
  }

  try {
    await touchProgress({ status: 'running' })

    const payload = await runWithLlmUsageContext(
      { source: 'eval', userId },
      () =>
        runChatEvalSuite(userId, userName, caseIds, (progress) => touchProgress(progress))
    )

    await patchChatEvalJob(jobId, {
      status: 'completed',
      total: payload.results.length,
      completed: payload.results.length,
      currentCase: null,
      results: payload.results,
      summary: payload.summary,
      finishedAt: new Date().toISOString(),
      lastHeartbeatAt: new Date(),
    })

    return payload
  } catch (err) {
    await patchChatEvalJob(jobId, {
      status: 'failed',
      error: err.message || 'Evaluation run failed',
      finishedAt: new Date().toISOString(),
      lastHeartbeatAt: new Date(),
    })
    throw err
  }
}
