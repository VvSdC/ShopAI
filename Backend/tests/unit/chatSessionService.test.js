import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  MAX_SESSIONS_PER_USER,
  maybeTrimOldSessions,
} from '../../services/chatSessionService.js'

vi.mock('../../model/ChatSession.js', () => ({
  default: {
    countDocuments: vi.fn(),
    find: vi.fn(),
    deleteMany: vi.fn(),
  },
}))

describe('maybeTrimOldSessions', () => {
  beforeEach(async () => {
    const ChatSession = (await import('../../model/ChatSession.js')).default
    ChatSession.countDocuments.mockReset()
    ChatSession.find.mockReset()
    ChatSession.deleteMany.mockReset()
  })

  it('skips trim when session count is within the cap', async () => {
    const ChatSession = (await import('../../model/ChatSession.js')).default
    ChatSession.countDocuments.mockResolvedValue(MAX_SESSIONS_PER_USER)

    await maybeTrimOldSessions('user-1')

    expect(ChatSession.countDocuments).toHaveBeenCalledWith({ user: 'user-1' })
    expect(ChatSession.find).not.toHaveBeenCalled()
    expect(ChatSession.deleteMany).not.toHaveBeenCalled()
  })

  it('trims oldest sessions when count exceeds the cap', async () => {
    const ChatSession = (await import('../../model/ChatSession.js')).default
    ChatSession.countDocuments.mockResolvedValue(MAX_SESSIONS_PER_USER + 3)

    const stale = [{ _id: 'old-1' }, { _id: 'old-2' }, { _id: 'old-3' }]
    const findChain = {
      select: vi.fn().mockReturnThis(),
      sort: vi.fn().mockReturnThis(),
      skip: vi.fn().mockResolvedValue(stale),
    }
    ChatSession.find.mockReturnValue(findChain)
    ChatSession.deleteMany.mockResolvedValue({ deletedCount: 3 })

    await maybeTrimOldSessions('user-2')

    expect(ChatSession.find).toHaveBeenCalledWith({ user: 'user-2' })
    expect(findChain.skip).toHaveBeenCalledWith(MAX_SESSIONS_PER_USER)
    expect(ChatSession.deleteMany).toHaveBeenCalledWith({
      _id: { $in: ['old-1', 'old-2', 'old-3'] },
    })
  })
})
