import { describe, it, expect } from 'vitest'
import { sanitizeMessagesForLlmApi } from '../../services/llmService.js'

describe('sanitizeMessagesForLlmApi', () => {
  it('strips reasoning fields from assistant messages', () => {
    const cleaned = sanitizeMessagesForLlmApi([
      {
        role: 'assistant',
        content: 'Searching…',
        tool_calls: [{ id: '1', type: 'function', function: { name: 'search_products', arguments: '{}' } }],
        reasoning: 'internal chain of thought',
        reasoning_details: [{ type: 'reasoning.text', text: 'hidden' }],
        refusal: null,
      },
    ])

    expect(cleaned[0]).toEqual({
      role: 'assistant',
      content: 'Searching…',
      tool_calls: [
        { id: '1', type: 'function', function: { name: 'search_products', arguments: '{}' } },
      ],
    })
    expect(cleaned[0].reasoning).toBeUndefined()
    expect(cleaned[0].reasoning_details).toBeUndefined()
    expect(cleaned[0].refusal).toBeUndefined()
  })
})
