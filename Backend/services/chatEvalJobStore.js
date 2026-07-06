import EvalJob from '../model/EvalJob.js'

const MAX_JOBS = 20
/** No heartbeat while queued/running for this long → mark failed (process crash / lost worker). */
export const STALE_EVAL_JOB_MS = 15 * 60 * 1000

function mapEvalJob(doc) {
  if (!doc) return null
  const row = doc.toObject ? doc.toObject() : doc
  return {
    id: row.jobId,
    userId: String(row.user),
    status: row.status,
    total: row.total,
    completed: row.completed,
    currentCase: row.currentCase ?? null,
    results: row.results ?? [],
    summary: row.summary ?? null,
    error: row.error ?? null,
    startedAt: row.startedAt?.toISOString?.() || row.startedAt,
    finishedAt: row.finishedAt?.toISOString?.() || row.finishedAt || null,
    lastHeartbeatAt: row.lastHeartbeatAt?.toISOString?.() || row.lastHeartbeatAt || null,
  }
}

function heartbeatAt(job) {
  return job?.lastHeartbeatAt || job?.updatedAt || job?.startedAt
}

export async function reconcileStaleEvalJob(doc) {
  if (!doc) return null
  const row = doc.toObject ? doc.toObject() : doc
  if (!['queued', 'running'].includes(row.status)) return doc

  const lastSeen = heartbeatAt(row)
  if (!lastSeen) return doc

  const staleForMs = Date.now() - new Date(lastSeen).getTime()
  if (staleForMs <= STALE_EVAL_JOB_MS) return doc

  const updated = await EvalJob.findOneAndUpdate(
    { jobId: row.jobId, status: { $in: ['queued', 'running'] } },
    {
      $set: {
        status: 'failed',
        error: 'Evaluation job timed out or was interrupted before completion',
        finishedAt: new Date(),
        lastHeartbeatAt: new Date(),
      },
    },
    { new: true }
  )

  return updated || doc
}

async function trimOldJobs() {
  const count = await EvalJob.countDocuments()
  if (count < MAX_JOBS) return

  const toRemove = count - MAX_JOBS + 1
  const oldest = await EvalJob.find()
    .sort({ startedAt: 1 })
    .limit(toRemove)
    .select('_id')

  if (oldest.length) {
    await EvalJob.deleteMany({ _id: { $in: oldest.map((doc) => doc._id) } })
  }
}

export async function createChatEvalJob(userId) {
  await trimOldJobs()

  const now = new Date()
  const doc = await EvalJob.create({
    user: userId,
    status: 'queued',
    total: 0,
    completed: 0,
    currentCase: null,
    results: [],
    summary: null,
    error: null,
    startedAt: now,
    finishedAt: null,
    lastHeartbeatAt: now,
  })

  return mapEvalJob(doc)
}

export async function getChatEvalJob(jobId, userId) {
  const doc = await EvalJob.findOne({ jobId, user: userId })
  const reconciled = await reconcileStaleEvalJob(doc)
  return mapEvalJob(reconciled)
}

export async function patchChatEvalJob(jobId, patch) {
  const update = { ...patch }
  if (patch.finishedAt && typeof patch.finishedAt === 'string') {
    update.finishedAt = new Date(patch.finishedAt)
  }
  if (patch.lastHeartbeatAt && typeof patch.lastHeartbeatAt === 'string') {
    update.lastHeartbeatAt = new Date(patch.lastHeartbeatAt)
  }
  if (update.lastHeartbeatAt == null && ['queued', 'running'].includes(update.status)) {
    update.lastHeartbeatAt = new Date()
  }

  const doc = await EvalJob.findOneAndUpdate({ jobId }, { $set: update }, { new: true })
  return mapEvalJob(doc)
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
