import { describe, it, expect } from 'vitest'
import { normalizeChatInput } from '../../utils/chatInputNormalize.js'

describe('normalizeChatInput', () => {
  it('fixes common checkout typos', () => {
    expect(normalizeChatInput('chekout now')).toBe('checkout now')
    expect(normalizeChatInput('checkot please')).toBe('checkout please')
  })

  it('collapses repeated letters in greetings', () => {
    expect(normalizeChatInput('heyyy')).toBe('heyy')
  })

  it('normalizes order and discount typos', () => {
    expect(normalizeChatInput('show my ordrs')).toBe('show my orders')
    expect(normalizeChatInput('any discnt codes')).toBe('any discount codes')
  })

  it('leaves valid text unchanged aside from collapse', () => {
    expect(normalizeChatInput('find cricket bats under 2000')).toBe(
      'find cricket bats under 2000'
    )
  })
})
