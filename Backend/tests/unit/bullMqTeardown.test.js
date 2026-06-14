import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../config/redisClient.js', () => ({
  isRedisDegraded: vi.fn(() => true),
}))

describe('safeTeardownBullMq', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('force-closes worker and disconnects Redis without throwing', async () => {
    const close = vi.fn().mockResolvedValue(undefined)
    const disconnect = vi.fn()
    const worker = {
      close,
      on: vi.fn(),
      connection: { on: vi.fn(), client: { on: vi.fn() } },
      blockingConnection: { on: vi.fn() },
    }
    const queue = { close: vi.fn().mockResolvedValue(undefined), on: vi.fn() }
    const workerConnection = { disconnect, on: vi.fn() }
    const queueConnection = { disconnect, on: vi.fn() }

    const { safeTeardownBullMq } = await import('../../services/bullMqTeardown.js')

    await expect(
      safeTeardownBullMq({
        worker,
        queue,
        workerConnection,
        queueConnection,
        force: true,
      })
    ).resolves.toBeUndefined()

    expect(close).toHaveBeenCalledWith(true)
    expect(disconnect).toHaveBeenCalledTimes(2)
  })
})
