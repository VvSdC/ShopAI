import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  MAX_SESSIONS_PER_USER,
  maybeTrimOldSessions,
  listSessions,
  getSessionMessagesForClient,
} from '../../services/chatSessionService.js'

vi.mock('../../model/ChatSession.js', () => ({
  default: {
    countDocuments: vi.fn(),
    find: vi.fn(),
    findOne: vi.fn(),
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

describe('listSessions', () => {
  beforeEach(async () => {
    const ChatSession = (await import('../../model/ChatSession.js')).default
    ChatSession.find.mockReset()
  })

  it('loads only the last message for preview via $slice', async () => {
    const ChatSession = (await import('../../model/ChatSession.js')).default
    const selectMock = vi.fn()
    const chain = {
      select: selectMock.mockReturnThis(),
      sort: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([
        {
          _id: '507f1f77bcf86cd799439011',
          title: 'Cricket bat',
          updatedAt: new Date('2026-01-01'),
          createdAt: new Date('2026-01-01'),
          messageCount: 12,
          messages: [{ content: 'Last message preview text' }],
        },
      ]),
    }
    selectMock.mockReturnValue(chain)
    ChatSession.find.mockReturnValue(chain)

    const rows = await listSessions('user-1')

    expect(ChatSession.find).toHaveBeenCalledWith({ user: 'user-1' })
    expect(selectMock).toHaveBeenCalledWith('title updatedAt createdAt messageCount')
    expect(selectMock).toHaveBeenCalledWith({ messages: { $slice: -1 } })
    expect(rows[0].messageCount).toBe(12)
    expect(rows[0].preview).toBe('Last message preview text')
  })
})

describe('getSessionMessagesForClient', () => {
  beforeEach(async () => {
    const ChatSession = (await import('../../model/ChatSession.js')).default
    ChatSession.findOne.mockReset()
  })

  function buildMessages(count) {
    return Array.from({ length: count }, (_, index) => ({
      _id: `msg-${index}`,
      role: index % 2 === 0 ? 'user' : 'assistant',
      content: `message-${index}`,
      createdAt: new Date(`2026-01-${String(index + 1).padStart(2, '0')}`),
    }))
  }

  it('loads only the newest page on initial open', async () => {
    const ChatSession = (await import('../../model/ChatSession.js')).default
    const messages = buildMessages(45)
    ChatSession.findOne.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue({
        _id: '507f1f77bcf86cd799439011',
        title: 'Long chat',
        updatedAt: new Date('2026-01-02'),
        createdAt: new Date('2026-01-01'),
        messageCount: 45,
        messages,
      }),
    })

    const page = await getSessionMessagesForClient('user-1', '507f1f77bcf86cd799439011')

    expect(ChatSession.findOne).toHaveBeenCalledTimes(1)
    expect(page.messages).toHaveLength(20)
    expect(page.messages[0]._id).toBe('msg-25')
    expect(page.messages[19]._id).toBe('msg-44')
    expect(page.hasMoreOlder).toBe(true)
    expect(page.messageCount).toBe(45)
  })

  it('loads the next older page when beforeMessageId is set', async () => {
    const ChatSession = (await import('../../model/ChatSession.js')).default
    const messages = buildMessages(45)
    ChatSession.findOne.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue({
        _id: '507f1f77bcf86cd799439011',
        title: 'Long chat',
        updatedAt: new Date('2026-01-02'),
        createdAt: new Date('2026-01-01'),
        messageCount: 45,
        messages,
      }),
    })

    const page = await getSessionMessagesForClient('user-1', '507f1f77bcf86cd799439011', {
      beforeMessageId: 'msg-25',
    })

    expect(page.messages).toHaveLength(20)
    expect(page.messages[0]._id).toBe('msg-5')
    expect(page.messages[19]._id).toBe('msg-24')
    expect(page.hasMoreOlder).toBe(true)
  })

  it('returns an empty page when beforeMessageId is unknown', async () => {
    const ChatSession = (await import('../../model/ChatSession.js')).default
    ChatSession.findOne.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue({
        _id: '507f1f77bcf86cd799439011',
        title: 'Long chat',
        updatedAt: new Date('2026-01-02'),
        createdAt: new Date('2026-01-01'),
        messageCount: 45,
        messages: buildMessages(45),
      }),
    })

    const page = await getSessionMessagesForClient('user-1', '507f1f77bcf86cd799439011', {
      beforeMessageId: 'missing-id',
    })

    expect(page.messages).toHaveLength(0)
    expect(page.hasMoreOlder).toBe(false)
  })
})
