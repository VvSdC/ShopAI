import { describe, it, expect, vi, beforeEach } from 'vitest'

const { sendWelcomeEmail } = vi.hoisted(() => ({
  sendWelcomeEmail: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../../config/redisClient.js', () => ({
  isRedisOperational: () => false,
  createRedisConnection: vi.fn(),
}))

vi.mock('../../services/queueFailureHandler.js', () => ({
  DEFAULT_QUEUE_JOB_OPTIONS: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: true,
    removeOnFail: 100,
  },
  attachQueueFailureHandlers: vi.fn(),
}))

vi.mock('../../services/emailService.js', () => ({
  sendWelcomeEmail,
}))

import { isEmailQueueEnabled, scheduleWelcomeEmail } from '../../services/emailQueue.js'

describe('emailQueue', () => {
  beforeEach(() => {
    sendWelcomeEmail.mockClear()
  })

  it('is disabled when Redis is not configured', () => {
    expect(isEmailQueueEnabled()).toBe(false)
  })

  it('scheduleWelcomeEmail sends in-process without blocking when queue is disabled', async () => {
    scheduleWelcomeEmail('user@test.com', 'Test User')

    await vi.waitFor(() => {
      expect(sendWelcomeEmail).toHaveBeenCalledWith('user@test.com', 'Test User')
    })
  })

  it('scheduleWelcomeEmail ignores empty email', async () => {
    scheduleWelcomeEmail('', 'Test User')

    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(sendWelcomeEmail).not.toHaveBeenCalled()
  })
})
