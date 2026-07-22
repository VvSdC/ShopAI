import {
  storePendingChatQuery,
  readPendingChatQuery,
  clearPendingChatQuery,
} from './pendingChatQuery'

describe('pendingChatQuery', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  it('stores and reads pending chat query with return path', () => {
    storePendingChatQuery('show my orders', '/assistant')
    expect(readPendingChatQuery()).toEqual(
      expect.objectContaining({
        query: 'show my orders',
        returnPath: '/assistant',
      })
    )
  })

  it('clears stored pending query', () => {
    storePendingChatQuery('checkout please', '/assistant')
    clearPendingChatQuery()
    expect(readPendingChatQuery()).toBeNull()
  })

  it('ignores empty queries', () => {
    storePendingChatQuery('   ', '/assistant')
    expect(readPendingChatQuery()).toBeNull()
  })
})
