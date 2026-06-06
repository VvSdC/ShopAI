import crypto from 'crypto'

const jobs = new Map()
const MAX_JOBS = 20

function trimJobs() {
  if (jobs.size <= MAX_JOBS) return
  const oldest = [...jobs.values()].sort(
    (a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime()
  )
  while (jobs.size > MAX_JOBS && oldest.length) {
    jobs.delete(oldest.shift().id)
  }
}

export function createChatEvalJob(userId) {
  trimJobs()
  const id = crypto.randomUUID()
  const job = {
    id,
    userId: String(userId),
    status: 'queued',
    total: 0,
    completed: 0,
    currentCase: null,
    results: [],
    summary: null,
    error: null,
    startedAt: new Date().toISOString(),
    finishedAt: null,
  }
  jobs.set(id, job)
  return job
}

export function getChatEvalJob(jobId, userId) {
  const job = jobs.get(jobId)
  if (!job || job.userId !== String(userId)) return null
  return job
}

export function patchChatEvalJob(jobId, patch) {
  const job = jobs.get(jobId)
  if (!job) return null
  Object.assign(job, patch)
  return job
}

export function publicChatEvalJob(job) {
  return {
    id: job.id,
    status: job.status,
    total: job.total,
    completed: job.completed,
    currentCase: job.currentCase,
    results: job.results,
    summary: job.summary,
    error: job.error,
    startedAt: job.startedAt,
    finishedAt: job.finishedAt,
  }
}
