import EvalJob from '../model/EvalJob.js'

const MAX_JOBS = 20

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
  }
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

  const doc = await EvalJob.create({
    user: userId,
    status: 'queued',
    total: 0,
    completed: 0,
    currentCase: null,
    results: [],
    summary: null,
    error: null,
    startedAt: new Date(),
    finishedAt: null,
  })

  return mapEvalJob(doc)
}

export async function getChatEvalJob(jobId, userId) {
  const doc = await EvalJob.findOne({ jobId, user: userId })
  return mapEvalJob(doc)
}

export async function patchChatEvalJob(jobId, patch) {
  const update = { ...patch }
  if (patch.finishedAt && typeof patch.finishedAt === 'string') {
    update.finishedAt = new Date(patch.finishedAt)
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
