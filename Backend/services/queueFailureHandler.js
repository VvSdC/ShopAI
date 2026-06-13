import logger from '../utils/logger.js'
import FailedJob from '../model/FailedJob.js'

/** Shared BullMQ job options — retries with exponential backoff before dead-letter. */
export const DEFAULT_QUEUE_JOB_OPTIONS = {
  attempts: 3,
  backoff: { type: 'exponential', delay: 2000 },
  removeOnComplete: true,
  removeOnFail: 100,
}

export function isJobExhausted(job) {
  const maxAttempts = job?.opts?.attempts ?? 1
  return (job?.attemptsMade ?? 0) >= maxAttempts
}

/**
 * Persist a permanently failed queue job and emit a structured alert log.
 * Call only after all retry attempts are exhausted.
 */
export async function recordFailedJob({ queueName, job, error }) {
  const errorMessage = error?.message || String(error)
  const entry = {
    queueName,
    jobId: String(job.id),
    jobName: job.name || null,
    data: job.data ?? null,
    attemptsMade: job.attemptsMade ?? 0,
    maxAttempts: job.opts?.attempts ?? 1,
    errorMessage,
    errorStack: error?.stack ? String(error.stack).slice(0, 4000) : null,
    failedAt: new Date(),
  }

  await FailedJob.create(entry)

  logger.error(
    `[queue:dead-letter] ${queueName} job ${job.id} exhausted retries — ${errorMessage}`,
    {
      alert: 'queue_job_failed',
      queueName,
      jobId: String(job.id),
      jobName: job.name,
      jobData: job.data,
      attemptsMade: entry.attemptsMade,
      maxAttempts: entry.maxAttempts,
    }
  )

  return entry
}

/** Attach retry logging + dead-letter persistence when a job permanently fails. */
export function attachQueueFailureHandlers(worker, queueName) {
  worker.on('failed', (job, err) => {
    if (!job) {
      logger.error(`[${queueName}] Job failed with no job context:`, err?.message)
      return
    }

    const maxAttempts = job.opts?.attempts ?? 1

    if (!isJobExhausted(job)) {
      logger.warn(
        `[${queueName}] Job ${job.id} failed (attempt ${job.attemptsMade}/${maxAttempts}): ${err.message}`
      )
      return
    }

    recordFailedJob({ queueName, job, error: err }).catch((saveErr) => {
      logger.error(
        `[${queueName}] Could not persist dead-letter for job ${job.id}:`,
        saveErr.message
      )
    })
  })
}
