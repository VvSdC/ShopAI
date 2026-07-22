import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const {
  stopAllQueueWorkers,
  shutdownLlmUsageLogger,
  shutdownCache,
  mongooseClose,
} = vi.hoisted(() => ({
  stopAllQueueWorkers: vi.fn().mockResolvedValue(undefined),
  shutdownLlmUsageLogger: vi.fn().mockResolvedValue(undefined),
  shutdownCache: vi.fn().mockResolvedValue(undefined),
  mongooseClose: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../../services/checkoutQueue.js', () => ({
  stopCheckoutExpiryFallback: vi.fn(),
}))

vi.mock('../../services/queueWorkers.js', () => ({
  stopAllQueueWorkers,
}))

vi.mock('../../services/llmUsageLogger.js', () => ({
  shutdownLlmUsageLogger,
}))

vi.mock('../../services/cacheService.js', () => ({
  shutdownCache,
}))

vi.mock('mongoose', () => ({
  default: {
    connection: {
      readyState: 1,
      close: mongooseClose,
    },
  },
}))

import { registerGracefulShutdown } from '../../utils/gracefulShutdown.js'

describe('registerGracefulShutdown', () => {
  const listeners = {}

  beforeEach(() => {
    stopAllQueueWorkers.mockClear()
    shutdownLlmUsageLogger.mockClear()
    shutdownCache.mockClear()
    mongooseClose.mockClear()
    vi.spyOn(process, 'on').mockImplementation((event, handler) => {
      listeners[event] = handler
    })
    vi.spyOn(process, 'exit').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('drains workers before closing HTTP and Redis on SIGTERM', async () => {
    const order = []
    stopAllQueueWorkers.mockImplementation(async () => {
      order.push('workers')
    })
    shutdownLlmUsageLogger.mockImplementation(async () => {
      order.push('llm')
    })
    shutdownCache.mockImplementation(async () => {
      order.push('cache')
    })

    const server = {
      close: (cb) => {
        order.push('http')
        cb()
      },
    }

    registerGracefulShutdown({ server, label: 'test' })
    await listeners.SIGTERM()

    expect(order).toEqual(['workers', 'http', 'llm', 'cache'])
    expect(stopAllQueueWorkers).toHaveBeenCalledOnce()
    expect(process.exit).toHaveBeenCalledWith(0)
  })

  it('skips HTTP close when no server is provided (worker process)', async () => {
    const order = []
    stopAllQueueWorkers.mockImplementation(async () => {
      order.push('workers')
    })
    shutdownLlmUsageLogger.mockImplementation(async () => {
      order.push('llm')
    })
    shutdownCache.mockImplementation(async () => {
      order.push('cache')
    })

    registerGracefulShutdown({ label: 'worker-test' })
    await listeners.SIGINT()

    expect(order).toEqual(['workers', 'llm', 'cache'])
    expect(process.exit).toHaveBeenCalledWith(0)
  })
})
