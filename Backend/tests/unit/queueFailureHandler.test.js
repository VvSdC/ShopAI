import { describe, it, expect, vi, beforeEach } from 'vitest'

const createMock = vi.fn()

vi.mock('../../model/FailedJob.js', () => ({
  default: {
    create: (...args) => createMock(...args),
  },
}))

vi.mock('../../utils/logger.js', () => ({
  default: {
    warn: vi.fn(),
    error: vi.fn(),
    log: vi.fn(),
  },
}))

import logger from '../../utils/logger.js'
import {
  DEFAULT_QUEUE_JOB_OPTIONS,
  isJobExhausted,
  recordFailedJob,
  attachQueueFailureHandlers,
} from '../../services/queueFailureHandler.js'

describe('queueFailureHandler', () => {
  beforeEach(() => {
    createMock.mockReset()
    createMock.mockResolvedValue({})
    logger.warn.mockReset()
    logger.error.mockReset()
  })

  it('exports retry defaults with exponential backoff', () => {
    expect(DEFAULT_QUEUE_JOB_OPTIONS.attempts).toBe(3)
    expect(DEFAULT_QUEUE_JOB_OPTIONS.backoff).toEqual({
      type: 'exponential',
      delay: 2000,
    })
  })

  it('detects exhausted jobs after final attempt', () => {
    expect(isJobExhausted({ opts: { attempts: 3 }, attemptsMade: 2 })).toBe(false)
    expect(isJobExhausted({ opts: { attempts: 3 }, attemptsMade: 3 })).toBe(true)
  })

  it('persists dead-letter records and emits alert logs', async () => {
    const job = {
      id: 'tag-product-abc',
      name: 'tag-product',
      data: { productId: 'abc' },
      opts: { attempts: 3 },
      attemptsMade: 3,
    }
    const err = new Error('LLM unavailable')

    await recordFailedJob({ queueName: 'product-tagging', job, error: err })

    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        queueName: 'product-tagging',
        jobId: 'tag-product-abc',
        errorMessage: 'LLM unavailable',
        attemptsMade: 3,
        maxAttempts: 3,
      })
    )
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('[queue:dead-letter]'),
      expect.objectContaining({ alert: 'queue_job_failed', queueName: 'product-tagging' })
    )
  })

  it('logs retry warnings before dead-lettering', () => {
    const handlers = {}
    const worker = { on: vi.fn((event, fn) => { handlers[event] = fn }) }

    attachQueueFailureHandlers(worker, 'embedding-sync')
    handlers.failed(
      { id: '1', opts: { attempts: 3 }, attemptsMade: 1, data: {} },
      new Error('temporary')
    )

    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('attempt 1/3')
    )
    expect(createMock).not.toHaveBeenCalled()
  })

  it('dead-letters when retries are exhausted', async () => {
    const handlers = {}
    const worker = { on: vi.fn((event, fn) => { handlers[event] = fn }) }

    attachQueueFailureHandlers(worker, 'embedding-sync')
    handlers.failed(
      {
        id: 'embedding-sync-startup',
        name: 'sync-missing-embeddings',
        opts: { attempts: 3 },
        attemptsMade: 3,
        data: {},
      },
      new Error('Mongo timeout')
    )

    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(createMock).toHaveBeenCalledTimes(1)
  })
})
