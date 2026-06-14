import logger from '../utils/logger.js'
import { Queue, Worker } from 'bullmq'
import { config } from '../config/env.js'
import { createRedisConnection, isRedisOperational, attachBullMqWorkerErrorHandler } from '../config/redisClient.js'
import { runLlmUsageSummaryAggregation } from './llmUsageSummaryService.js'

const QUEUE_NAME = 'llm-usage-summary'
const JOB_NAME = 'aggregate-daily-stats'
const REPEAT_JOB_ID = 'llm-usage-summary-cron'
const STARTUP_JOB_ID = 'llm-usage-summary-startup'

let queue = null
let worker = null
let queueConnection = null
let workerConnection = null

export function isLlmUsageSummaryQueueEnabled() {
  return isRedisOperational() && config.analytics.llmUsageSummaryQueueEnabled
}

function getLlmUsageSummaryQueue() {
  if (!isLlmUsageSummaryQueueEnabled()) return null
  if (!queue) {
    queueConnection = createRedisConnection('llm-usage-summary-queue')
    queue = new Queue(QUEUE_NAME, { connection: queueConnection })
  }
  return queue
}

async function ensureRepeatableSchedule() {
  const summaryQueue = getLlmUsageSummaryQueue()
  if (!summaryQueue) return

  const pattern = config.analytics.llmUsageSummaryCron
  const existing = await summaryQueue.getRepeatableJobs()
  for (const job of existing) {
    if (job.name === JOB_NAME) {
      await summaryQueue.removeRepeatableByKey(job.key)
    }
  }

  await summaryQueue.add(
    JOB_NAME,
    { backfillDays: config.analytics.llmUsageSummaryRefreshDays },
    {
      repeat: { pattern },
      jobId: REPEAT_JOB_ID,
    }
  )

  logger.log(`[llmUsageSummaryQueue] Scheduled cron aggregation (${pattern})`)
}

export async function enqueueLlmUsageSummaryRun({ backfillDays, delayMs = 0 } = {}) {
  const summaryQueue = getLlmUsageSummaryQueue()
  if (!summaryQueue) return false

  try {
    const existing = await summaryQueue.getJob(STARTUP_JOB_ID)
    if (existing) {
      const state = await existing.getState()
      if (state === 'active' || state === 'waiting' || state === 'delayed') {
        return true
      }
      await existing.remove()
    }

    await summaryQueue.add(
      JOB_NAME,
      {
        backfillDays:
          backfillDays ?? config.analytics.llmUsageSummaryBackfillDays,
      },
      {
        jobId: STARTUP_JOB_ID,
        delay: Math.max(0, delayMs),
        removeOnComplete: true,
        removeOnFail: 50,
      }
    )
    return true
  } catch (err) {
    logger.warn('[llmUsageSummaryQueue] enqueue failed:', err.message)
    return false
  }
}

export async function startLlmUsageSummaryWorker() {
  if (!isLlmUsageSummaryQueueEnabled()) {
    logger.log(
      '[llmUsageSummaryQueue] Worker disabled — set REDIS_URL and ENABLE_LLM_USAGE_SUMMARY_QUEUE=true'
    )
    return null
  }

  if (worker) return worker

  workerConnection = createRedisConnection('llm-usage-summary-worker')
  worker = new Worker(
    QUEUE_NAME,
    async (job) => {
      const backfillDays =
        job.data?.backfillDays ?? config.analytics.llmUsageSummaryRefreshDays
      return runLlmUsageSummaryAggregation({ backfillDays })
    },
    {
      connection: workerConnection,
      concurrency: 1,
    }
  )

  worker.on('failed', (job, err) => {
    logger.error(`[llmUsageSummaryQueue] Job ${job?.id} failed:`, err.message)
  })

  attachBullMqWorkerErrorHandler(worker, 'llmUsageSummaryQueue')

  await ensureRepeatableSchedule()
  await enqueueLlmUsageSummaryRun({
    backfillDays: config.analytics.llmUsageSummaryBackfillDays,
    delayMs: config.analytics.llmUsageSummaryStartupDelayMs,
  })

  logger.log('[llmUsageSummaryQueue] Worker started')
  return worker
}

export async function stopLlmUsageSummaryWorker() {
  if (worker) {
    await worker.close()
    worker = null
  }
  if (queue) {
    await queue.close()
    queue = null
  }
  if (workerConnection) {
    await workerConnection.quit()
    workerConnection = null
  }
  if (queueConnection) {
    await queueConnection.quit()
    queueConnection = null
  }
}
