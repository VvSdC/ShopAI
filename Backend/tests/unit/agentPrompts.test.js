import { describe, it, expect, beforeEach } from 'vitest'
import {
  getAgentSystemPrompt,
  clearAgentPromptCache,
} from '../../services/chatGraph/agentPrompts.js'

describe('getAgentSystemPrompt', () => {
  beforeEach(() => {
    clearAgentPromptCache()
  })

  it('caches prompts by route and userName at module scope', () => {
    const checkout = getAgentSystemPrompt('checkout', 'Riya')
    expect(getAgentSystemPrompt('checkout', 'Riya')).toBe(checkout)

    getAgentSystemPrompt('retrieval', 'Riya')
    getAgentSystemPrompt('checkout', 'Alex')

    expect(checkout).toContain('Riya')
    expect(checkout).toContain('checkout')
    expect(getAgentSystemPrompt('retrieval', 'Riya')).toContain('discover products')
  })

  it('reuses cached prompts across separate calls without request context', () => {
    const first = getAgentSystemPrompt('general', 'Sam')
    const second = getAgentSystemPrompt('general', 'Sam')
    expect(first).toBe(second)
    expect(first).toContain('Sam')
    expect(first).toContain('ShopAI')
  })
})
