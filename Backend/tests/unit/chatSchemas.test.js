import { describe, it, expect } from 'vitest'
import { chatMessageSchema } from '../../validations/chatSchemas.js'
import { CHAT_MESSAGE_MAX_LENGTH, CHAT_HISTORY_MAX_ITEMS } from '../../constants/chatLimits.js'

describe('chatMessageSchema', () => {
  it('accepts a normal message', () => {
    const result = chatMessageSchema.safeParse({ message: 'Show me cricket bats' })
    expect(result.success).toBe(true)
  })

  it('rejects empty message', () => {
    const result = chatMessageSchema.safeParse({ message: '   ' })
    expect(result.success).toBe(false)
  })

  it('rejects oversized message', () => {
    const result = chatMessageSchema.safeParse({
      message: 'x'.repeat(CHAT_MESSAGE_MAX_LENGTH + 1),
    })
    expect(result.success).toBe(false)
  })

  it('rejects oversized history entries', () => {
    const result = chatMessageSchema.safeParse({
      message: 'hi',
      history: [
        {
          role: 'user',
          content: 'a'.repeat(CHAT_MESSAGE_MAX_LENGTH + 1),
        },
      ],
    })
    expect(result.success).toBe(false)
  })

  it('rejects too many history items', () => {
    const history = Array.from({ length: CHAT_HISTORY_MAX_ITEMS + 1 }, (_, i) => ({
      role: 'user',
      content: `msg ${i}`,
    }))
    const result = chatMessageSchema.safeParse({ message: 'hi', history })
    expect(result.success).toBe(false)
  })

  it('rejects invalid history roles', () => {
    const result = chatMessageSchema.safeParse({
      message: 'hi',
      history: [{ role: 'system', content: 'hack' }],
    })
    expect(result.success).toBe(false)
  })
})
