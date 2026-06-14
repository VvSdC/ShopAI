import { describe, it, expect, vi, beforeEach } from 'vitest'

const stopAllQueueWorkers = vi.fn().mockResolvedValue(undefined)

vi.mock('../../services/queueWorkers.js', () => ({
  stopAllQueueWorkers,
}))

vi.mock('ioredis', () => {
  const instances = []
  class Redis {
    constructor() {
      this.status = 'wait'
      this.handlers = {}
      instances.push(this)
    }

    on(event, fn) {
      this.handlers[event] = fn
    }

    connect() {
      this.status = 'ready'
      this.handlers.ready?.()
      return Promise.resolve()
    }

    ping() {
      return Promise.resolve('PONG')
    }

    quit() {
      this.status = 'end'
      this.handlers.end?.()
      return Promise.resolve()
    }
  }

  Redis.instances = instances
  return { default: Redis }
})

describe('redisClient', () => {
  beforeEach(() => {
    vi.resetModules()
    stopAllQueueWorkers.mockClear()
  })

  it('reuses one client for cache and rate-limit', async () => {
    vi.doMock('../../config/env.js', () => ({
      config: {
        redis: { url: 'redis://127.0.0.1:6379' },
        isTest: false,
      },
    }))

    const Redis = (await import('ioredis')).default
    const { getAppRedisClient, getRateLimitRedisClient } = await import(
      '../../config/redisClient.js'
    )

    const cacheClient = await getAppRedisClient()
    const rateLimitClient = getRateLimitRedisClient()

    expect(cacheClient).toBe(rateLimitClient)
    expect(Redis.instances).toHaveLength(1)
  })

  it('detects fatal Redis errors including Upstash quota', async () => {
    vi.doMock('../../config/env.js', () => ({
      config: {
        redis: { url: 'redis://127.0.0.1:6379' },
        isTest: false,
      },
    }))

    const { isRedisFatalError } = await import('../../config/redisClient.js')

    expect(
      isRedisFatalError(
        new Error(
          'ERR max requests limit exceeded. Limit: 500000, Usage: 500003'
        )
      )
    ).toBe(true)
    expect(isRedisFatalError(new Error('ECONNREFUSED'))).toBe(true)
    expect(isRedisFatalError(new Error('some transient glitch'))).toBe(false)
  })

  it('degrades Redis and stops queue workers on fatal errors', async () => {
    vi.doMock('../../config/env.js', () => ({
      config: {
        redis: { url: 'redis://127.0.0.1:6379' },
        isTest: false,
      },
    }))

    const {
      disableRedis,
      isRedisOperational,
      isRedisDegraded,
      getRedisDisableReason,
      resetRedisDegradedStateForTests,
    } = await import('../../config/redisClient.js')

    expect(isRedisOperational()).toBe(true)

    await disableRedis('max requests limit exceeded')

    expect(isRedisDegraded()).toBe(true)
    expect(getRedisDisableReason()).toContain('max requests limit exceeded')
    expect(isRedisOperational()).toBe(false)
    expect(stopAllQueueWorkers).toHaveBeenCalled()

    resetRedisDegradedStateForTests()
    expect(isRedisOperational()).toBe(true)
  })
})
