import { describe, it, expect } from 'vitest'
import {
  estimateTextTokens,
  estimateMessageTokens,
  trimHistoryToTokenBudget,
  prepareChatHistoryForLlm,
} from '../../utils/chatHistoryTrim.js'

describe('chatHistoryTrim', () => {
  it('estimates tokens as characters divided by four', () => {
    expect(estimateTextTokens('')).toBe(0)
    expect(estimateTextTokens('abcd')).toBe(1)
    expect(estimateTextTokens('abcde')).toBe(2)
  })

  it('keeps all messages when within budget', () => {
    const history = [
      { role: 'user', content: 'hello' },
      { role: 'assistant', content: 'hi there' },
    ]
    expect(trimHistoryToTokenBudget(history, 100)).toEqual(history)
  })

  it('drops oldest messages first when over budget', () => {
    const history = [
      { role: 'user', content: 'a'.repeat(400) },
      { role: 'assistant', content: 'b'.repeat(400) },
      { role: 'user', content: 'recent question' },
    ]

    const trimmed = trimHistoryToTokenBudget(history, 30)
    expect(trimmed).toHaveLength(1)
    expect(trimmed[0].content).toBe('recent question')
  })

  it('preserves message order for the kept tail', () => {
    const history = [
      { role: 'user', content: 'old'.repeat(200) },
      { role: 'assistant', content: 'mid' },
      { role: 'user', content: 'new' },
    ]

    const trimmed = trimHistoryToTokenBudget(history, 20)
    expect(trimmed.map((m) => m.content)).toEqual(['mid', 'new'])
  })

  it('normalizes roles and clamps content in prepareChatHistoryForLlm', () => {
    const trimmed = prepareChatHistoryForLlm(
      [{ role: 'assistant', content: 'x'.repeat(5000) }],
      50
    )
    expect(trimmed).toHaveLength(0)
  })

  it('accounts for role overhead in message token estimates', () => {
    const message = { role: 'user', content: 'test' }
    expect(estimateMessageTokens(message)).toBeGreaterThan(estimateTextTokens('test'))
  })

  it('counts multipart content arrays', () => {
    const message = {
      role: 'user',
      content: [{ type: 'text', text: 'hello' }, { type: 'text', text: 'world' }],
    }
    expect(estimateMessageTokens(message)).toBeGreaterThan(
      estimateMessageTokens({ role: 'user', content: 'hello' })
    )
  })

  it('counts assistant tool_calls and tool result payloads', () => {
    const toolPayload = JSON.stringify({ products: [{ name: 'Shirt', price: 1999 }] })
    const assistant = {
      role: 'assistant',
      content: '',
      tool_calls: [
        {
          id: 'call_1',
          type: 'function',
          function: { name: 'search_products', arguments: '{"query":"shirt"}' },
        },
      ],
    }
    const tool = {
      role: 'tool',
      tool_call_id: 'call_1',
      content: toolPayload,
    }

    expect(estimateMessageTokens(assistant)).toBeGreaterThan(4)
    expect(estimateMessageTokens(tool)).toBeGreaterThan(estimateTextTokens(toolPayload))
  })

  it('drops tool-heavy oldest turns when over budget', () => {
    const history = [
      {
        role: 'assistant',
        content: '',
        tool_calls: [
          {
            id: 'call_old',
            function: { name: 'search_products', arguments: '{"query":"old"}' },
          },
        ],
      },
      {
        role: 'tool',
        tool_call_id: 'call_old',
        content: JSON.stringify({ products: [{ name: 'Old'.repeat(400) }] }),
      },
      { role: 'user', content: 'recent question' },
    ]

    const trimmed = trimHistoryToTokenBudget(history, 30)
    expect(trimmed).toHaveLength(1)
    expect(trimmed[0].content).toBe('recent question')
  })
})
