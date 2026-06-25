import { describe, it, expect } from 'vitest'
import { mergeToolCallDeltas } from '../../services/chatStream.js'

describe('chatStream helpers', () => {
  it('merges streamed tool call deltas by index', () => {
    const accumulated = {}
    mergeToolCallDeltas(accumulated, [
      {
        index: 0,
        id: 'call_1',
        function: { name: 'get_', arguments: '' },
      },
    ])
    mergeToolCallDeltas(accumulated, [
      {
        index: 0,
        function: { name: 'cart' },
      },
    ])
    mergeToolCallDeltas(accumulated, [
      {
        index: 0,
        function: { arguments: '{' },
      },
    ])
    mergeToolCallDeltas(accumulated, [
      {
        index: 0,
        function: { arguments: '}' },
      },
    ])

    expect(accumulated[0]).toEqual({
      id: 'call_1',
      type: 'function',
      function: { name: 'get_cart', arguments: '{}'},
    })
  })
})
