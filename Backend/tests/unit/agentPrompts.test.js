import { describe, it, expect, beforeEach } from 'vitest'
import {
  getAgentSystemPrompt,
  buildAgentSystemPrompt,
  shouldIncludePolicyKnowledge,
  clearAgentPromptCache,
  getAgentPromptCacheSize,
} from '../../services/chatGraph/agentPrompts.js'

describe('getAgentSystemPrompt', () => {
  beforeEach(() => {
    clearAgentPromptCache()
  })

  it('personalizes cached route templates per userName', () => {
    const checkoutRiya = getAgentSystemPrompt('checkout', 'Riya')
    const checkoutAlex = getAgentSystemPrompt('checkout', 'Alex')

    expect(checkoutRiya).toContain('Riya')
    expect(checkoutAlex).toContain('Alex')
    expect(checkoutRiya).toContain('checkout')
    expect(getAgentSystemPrompt('retrieval', 'Riya')).toContain('discover products')
    expect(getAgentPromptCacheSize()).toBe(2)
  })

  it('reuses route templates across many user names without growing the cache', () => {
    for (let i = 0; i < 500; i++) {
      getAgentSystemPrompt('general', `User ${i}`)
    }

    expect(getAgentPromptCacheSize()).toBe(1)

    const prompt = getAgentSystemPrompt('general', 'Sam')
    expect(prompt).toContain('Sam')
    expect(prompt).toContain('ShopAI')
  })

  it('includes compact policy knowledge on first policy turn', () => {
    const prompt = buildAgentSystemPrompt('policies', 'Sam', { includePolicyKnowledge: true })
    expect(prompt).toContain('Returns: 3 days post-delivery')
    expect(prompt).not.toContain('Use prior conversation for policy context')
    expect(getAgentPromptCacheSize()).toBe(1)
  })

  it('omits policy knowledge block on follow-up policy turns', () => {
    const prompt = buildAgentSystemPrompt('policies', 'Sam', { includePolicyKnowledge: false })
    expect(prompt).toContain('Use prior conversation for policy context')
    expect(prompt).not.toContain('Returns: 3 days post-delivery')
    expect(getAgentPromptCacheSize()).toBe(1)
  })

  it('caches full and lite policy variants separately', () => {
    buildAgentSystemPrompt('policies', 'Sam', { includePolicyKnowledge: true })
    buildAgentSystemPrompt('policies', 'Sam', { includePolicyKnowledge: false })
    expect(getAgentPromptCacheSize()).toBe(2)
  })

  it('detects when policy context is already in session history', () => {
    expect(shouldIncludePolicyKnowledge([])).toBe(true)
    expect(
      shouldIncludePolicyKnowledge([{ role: 'assistant', content: 'Welcome to ShopAI!' }])
    ).toBe(true)
    expect(
      shouldIncludePolicyKnowledge([
        { role: 'assistant', content: 'Returns are accepted within 3 days of delivery.' },
      ])
    ).toBe(false)
  })
})
