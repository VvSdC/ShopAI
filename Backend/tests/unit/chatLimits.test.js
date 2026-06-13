import { describe, it, expect } from 'vitest'
import {
  LLM_MAX_TOKENS_CLASSIFIER,
  LLM_MAX_TOKENS_GREETING_POLICIES,
  LLM_MAX_TOKENS_AGENT,
  LLM_MAX_TOKENS_COMPARISON,
  getMaxTokensForRoute,
} from '../../constants/chatLimits.js'

describe('getMaxTokensForRoute', () => {
  it('uses classifier budget for guard/intent callers (exported constant)', () => {
    expect(LLM_MAX_TOKENS_CLASSIFIER).toBe(100)
  })

  it('maps conversational routes to greeting/policies budget', () => {
    expect(getMaxTokensForRoute('general')).toBe(LLM_MAX_TOKENS_GREETING_POLICIES)
    expect(getMaxTokensForRoute('policies')).toBe(LLM_MAX_TOKENS_GREETING_POLICIES)
    expect(LLM_MAX_TOKENS_GREETING_POLICIES).toBe(512)
  })

  it('maps shopping agent routes to agent budget', () => {
    for (const route of [
      'retrieval',
      'checkout',
      'product_detail',
      'payment',
      'order_summary',
      'order_update',
    ]) {
      expect(getMaxTokensForRoute(route)).toBe(LLM_MAX_TOKENS_AGENT)
    }
    expect(LLM_MAX_TOKENS_AGENT).toBe(1024)
  })

  it('maps comparison to the largest budget', () => {
    expect(getMaxTokensForRoute('comparison')).toBe(LLM_MAX_TOKENS_COMPARISON)
    expect(LLM_MAX_TOKENS_COMPARISON).toBe(2048)
  })
})
