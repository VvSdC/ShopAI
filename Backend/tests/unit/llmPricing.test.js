import { describe, it, expect } from 'vitest'
import { estimateLlmCostUsd, listKnownPricing } from '../../services/llmPricing.js'

describe('llmPricing', () => {
  it('returns 0 for empty usage', () => {
    expect(estimateLlmCostUsd({ provider: 'OpenRouter', promptTokens: 0, completionTokens: 0 })).toBe(0)
  })

  it('estimates gpt-4o-mini cost from prompt+completion tokens', () => {
    const cost = estimateLlmCostUsd({
      provider: 'OpenRouter',
      model: 'openai/gpt-4o-mini',
      promptTokens: 1000,
      completionTokens: 500,
    })
    // input 1000 * 0.00015/1000 + output 500 * 0.0006/1000 = 0.00015 + 0.0003 = 0.00045
    expect(cost).toBeCloseTo(0.00045, 5)
  })

  it('falls back to provider default when model is unknown', () => {
    const cost = estimateLlmCostUsd({
      provider: 'openrouter',
      model: 'some/random-model-name',
      promptTokens: 1000,
      completionTokens: 1000,
    })
    // openrouter default: input 0.0005, output 0.0015 → 0.0005 + 0.0015 = 0.002
    expect(cost).toBeCloseTo(0.002, 6)
  })

  it('returns 0 for free-tier huggingface', () => {
    expect(
      estimateLlmCostUsd({
        provider: 'huggingface',
        model: 'Qwen/Qwen2.5-7B-Instruct',
        promptTokens: 5000,
        completionTokens: 5000,
      })
    ).toBe(0)
  })

  it('handles missing provider gracefully', () => {
    const cost = estimateLlmCostUsd({ promptTokens: 100, completionTokens: 100 })
    expect(cost).toBe(0)
  })

  it('listKnownPricing includes provider defaults + model overrides', () => {
    const rows = listKnownPricing()
    expect(rows.some((r) => r.provider === 'openrouter')).toBe(true)
    expect(rows.some((r) => r.model === 'gpt-4o-mini')).toBe(true)
  })
})
