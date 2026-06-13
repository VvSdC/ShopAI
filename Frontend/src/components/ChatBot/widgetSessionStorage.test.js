import { readWidgetSessionId, writeWidgetSessionId, clearWidgetSessionId } from './widgetSessionStorage'

describe('widgetSessionStorage', () => {
  const userId = 'user-abc'

  beforeEach(() => {
    sessionStorage.clear()
  })

  it('writes and reads session id per user', () => {
    writeWidgetSessionId(userId, 'session-123')
    expect(readWidgetSessionId(userId)).toBe('session-123')
    expect(readWidgetSessionId('other-user')).toBeNull()
  })

  it('clears stored session id', () => {
    writeWidgetSessionId(userId, 'session-123')
    clearWidgetSessionId(userId)
    expect(readWidgetSessionId(userId)).toBeNull()
  })
})
