import { describe, it, expect } from 'vitest'
import { getLlmUsageContext, runWithLlmUsageContext } from '../../services/llmUsageContext.js'

describe('getAgentSystemPrompt', () => {
  it('caches prompts by route and userName for the request', async () => {
    await runWithLlmUsageContext({ agentPromptCache: new Map() }, async () => {
      const { getAgentSystemPrompt } = await import('../../services/chatGraph/agentPrompts.js')
      const store = getLlmUsageContext()

      const checkout = getAgentSystemPrompt('checkout', 'Riya')
      expect(store.agentPromptCache.size).toBe(1)
      expect(getAgentSystemPrompt('checkout', 'Riya')).toBe(checkout)

      getAgentSystemPrompt('retrieval', 'Riya')
      expect(store.agentPromptCache.size).toBe(2)

      expect(checkout).toContain('Riya')
      expect(checkout).toContain('checkout')
    })
  })

  it('returns valid prompts without a request cache', async () => {
    const { getAgentSystemPrompt } = await import('../../services/chatGraph/agentPrompts.js')
    const prompt = getAgentSystemPrompt('general', 'Sam')
    expect(prompt).toContain('Sam')
    expect(prompt).toContain('ShopAI')
  })
})
