import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../model/LlmUsageLog.js', () => ({
  default: {
    insertMany: vi.fn().mockResolvedValue([]),
    create: vi.fn().mockResolvedValue({}),
  },
}))

vi.mock('../../config/env.js', () => ({
  config: { isTest: false },
}))

vi.mock('../../services/llmUsageContext.js', () => ({
  getLlmUsageContext: () => ({}),
}))

describe('llmUsageLogger', () => {
  beforeEach(async () => {
    vi.resetModules()
    const LlmUsageLog = (await import('../../model/LlmUsageLog.js')).default
    LlmUsageLog.insertMany.mockClear()
    LlmUsageLog.create.mockClear()
  })

  it('buffers records and flushes with insertMany', async () => {
    const { recordLlmUsage, flushLlmUsageBuffer } = await import(
      '../../services/llmUsageLogger.js'
    )
    const LlmUsageLog = (await import('../../model/LlmUsageLog.js')).default

    recordLlmUsage({
      provider: 'OpenRouter',
      model: 'test-model',
      responseData: { usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 } },
      latencyMs: 120,
    })
    recordLlmUsage({
      provider: 'Gemini',
      model: 'gemini-test',
      responseData: { usage: { prompt_tokens: 3, completion_tokens: 2, total_tokens: 5 } },
      latencyMs: 80,
    })

    expect(LlmUsageLog.insertMany).not.toHaveBeenCalled()

    const flushed = await flushLlmUsageBuffer()
    expect(flushed).toBe(2)
    expect(LlmUsageLog.insertMany).toHaveBeenCalledTimes(1)
    expect(LlmUsageLog.insertMany.mock.calls[0][1]).toEqual({ ordered: false })
    expect(LlmUsageLog.insertMany.mock.calls[0][0]).toHaveLength(2)
    expect(LlmUsageLog.insertMany.mock.calls[0][0][0].provider).toBe('OpenRouter')
  })
})
