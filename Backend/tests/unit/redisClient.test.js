import { describe, it, expect, vi, beforeEach } from 'vitest'

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

    quit() {
      this.status = 'end'
      this.handlers.end?.()
      return Promise.resolve()
    }
  }

  Redis.instances = instances
  return { default: Redis }
})

describe('redisClient shared app client', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('reuses one client for cache and rate-limit', async () => {
    vi.doMock('../config/env.js', () => ({
      config: {
        redis: { url: 'redis://127.0.0.1:6379' },
        isTest: false,
      },
    }))

    const Redis = (await import('ioredis')).default
    const { getAppRedisClient, getRateLimitRedisClient } = await import('../config/redisClient.js')

    const cacheClient = await getAppRedisClient()
    const rateLimitClient = getRateLimitRedisClient()

    expect(cacheClient).toBe(rateLimitClient)
    expect(Redis.instances).toHaveLength(1)
  })
})
