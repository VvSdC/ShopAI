import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('chatDeterministicAssist', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it('runs cart, address, and checkout assists in order when enabled', async () => {
    vi.doMock('../../config/env.js', () => ({
      config: { chat: { deterministicAssist: true } },
    }))
    vi.doMock('../../services/chatCartAssist.js', () => ({
      runCartAssist: vi.fn(async () => ({ toolResults: [], reply: null })),
    }))
    vi.doMock('../../services/chatAddressAssist.js', () => ({
      runAddressAssist: vi.fn(async () => ({ toolResults: [], reply: null })),
    }))
    vi.doMock('../../services/chatCheckoutAssist.js', () => ({
      runCheckoutAssist: vi.fn(async () => ({ toolResults: [], reply: null })),
    }))
    vi.doMock('../../services/chatPostProcess.js', () => ({
      ensureCheckoutOnConfirm: vi.fn(async (_userId, _text, _msgs, results) => results),
    }))

    const { runDeterministicChatAssist } = await import('../../services/chatDeterministicAssist.js')
    const { runCartAssist } = await import('../../services/chatCartAssist.js')
    const { runAddressAssist } = await import('../../services/chatAddressAssist.js')
    const { runCheckoutAssist } = await import('../../services/chatCheckoutAssist.js')
    const { ensureCheckoutOnConfirm } = await import('../../services/chatPostProcess.js')

    await runDeterministicChatAssist({
      userId: 'user1',
      userText: 'proceed to checkout',
      history: [],
      graphResult: { reply: 'graph reply', toolResults: [], route: 'checkout' },
    })

    expect(runCartAssist).toHaveBeenCalledBefore(runAddressAssist)
    expect(runAddressAssist).toHaveBeenCalledBefore(runCheckoutAssist)
    expect(runCheckoutAssist).toHaveBeenCalledBefore(ensureCheckoutOnConfirm)
  })

  it('skips assists when disabled via config', async () => {
    vi.doMock('../../config/env.js', () => ({
      config: { chat: { deterministicAssist: false } },
    }))
    vi.doMock('../../services/chatCartAssist.js', () => ({
      runCartAssist: vi.fn(async () => ({ toolResults: [], reply: 'should not run' })),
    }))
    vi.doMock('../../services/chatAddressAssist.js', () => ({
      runAddressAssist: vi.fn(async () => ({ toolResults: [], reply: null })),
    }))
    vi.doMock('../../services/chatCheckoutAssist.js', () => ({
      runCheckoutAssist: vi.fn(async () => ({ toolResults: [], reply: null })),
    }))
    vi.doMock('../../services/chatPostProcess.js', () => ({
      ensureCheckoutOnConfirm: vi.fn(async (_userId, _text, _msgs, results) => results),
    }))

    const { runDeterministicChatAssist } = await import('../../services/chatDeterministicAssist.js')
    const { runCartAssist } = await import('../../services/chatCartAssist.js')

    const result = await runDeterministicChatAssist({
      userId: 'user1',
      userText: 'add shirt',
      history: [],
      graphResult: { reply: 'only graph', toolResults: [{ id: 1 }], route: 'checkout' },
    })

    expect(runCartAssist).not.toHaveBeenCalled()
    expect(result.reply).toBe('only graph')
    expect(result.toolResults).toEqual([{ id: 1 }])
  })
})
