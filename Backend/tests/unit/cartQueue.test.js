import { describe, it, expect } from 'vitest'
import ChatSession from '../../model/ChatSession.js'
import User from '../../model/User.js'
import {
  normalizeCartQueue,
  parseCartQueueFromHistory,
  resolveActiveCartQueue,
  stripCartQueueMarker,
} from '../../services/cartQueue.js'
import { appendMessages, sessionCartQueueForAssist, MAX_MESSAGES_PER_SESSION } from '../../services/chatSessionService.js'

describe('cartQueue', () => {
  it('normalizes queue items', () => {
    const queue = normalizeCartQueue({
      remaining: [{ productId: '507f1f77bcf86cd799439014', name: 'ball', qty: 0 }],
    })
    expect(queue.remaining[0].qty).toBe(1)
  })

  it('prefers session cartQueue over legacy markdown markers', () => {
    const legacy = parseCartQueueFromHistory([
      {
        role: 'assistant',
        content: `Need color\n\n[//]: # (cart-queue {"remaining":[{"productId":"old","name":"old","qty":1}]})`,
      },
    ])
    expect(legacy.remaining[0].productId).toBe('old')

    const resolved = resolveActiveCartQueue(
      [{ role: 'assistant', content: 'Need color' }],
      { remaining: [{ productId: 'new', name: 'bat', qty: 2 }] }
    )
    expect(resolved.remaining[0].productId).toBe('new')
  })

  it('strips legacy markers from assistant content', () => {
    const cleaned = stripCartQueueMarker(
      'Need color\n\n[//]: # (cart-queue {"remaining":[{"productId":"507f1f77bcf86cd799439014","name":"ball","qty":2}]})'
    )
    expect(cleaned).toBe('Need color')
    expect(cleaned).not.toContain('cart-queue')
  })
})

describe('appendMessages message cap', () => {
  it('caps stored messages at MAX_MESSAGES_PER_SESSION via $slice', async () => {
    const user = await User.create({
      fullname: 'Cap User',
      email: `cap-${Date.now()}@test.com`,
      password: 'hashed',
    })

    const seedMessages = Array.from({ length: MAX_MESSAGES_PER_SESSION - 1 }, (_, i) => ({
      role: i % 2 === 0 ? 'user' : 'assistant',
      content: `seed-${i}`,
    }))

    const session = await ChatSession.create({
      user: user._id,
      title: 'Cap test',
      messageCount: seedMessages.length,
      messages: seedMessages,
    })

    await appendMessages(session, 'near cap user', 'near cap assistant')

    const reloaded = await ChatSession.findById(session._id)
    expect(reloaded.messages).toHaveLength(MAX_MESSAGES_PER_SESSION)
    expect(reloaded.messageCount).toBe(MAX_MESSAGES_PER_SESSION)
    expect(reloaded.messages.at(-2).content).toBe('near cap user')
    expect(reloaded.messages.at(-1).content).toBe('near cap assistant')
    expect(reloaded.messages[0].content).not.toBe('seed-0')

    await appendMessages(reloaded, 'after cap user', 'after cap assistant')

    const capped = await ChatSession.findById(session._id)
    expect(capped.messages).toHaveLength(MAX_MESSAGES_PER_SESSION)
    expect(capped.messageCount).toBe(MAX_MESSAGES_PER_SESSION)
    expect(capped.messages.at(-1).content).toBe('after cap assistant')
  })
})

describe('ChatSession cartQueue field', () => {
  it('persists cart queue on the session document', async () => {
    const user = await User.create({
      fullname: 'Cart Queue User',
      email: `cart-queue-${Date.now()}@test.com`,
      password: 'hashed',
    })

    const session = await ChatSession.create({
      user: user._id,
      title: 'Cart test',
      messages: [{ role: 'assistant', content: 'Hi' }],
    })

    const queue = {
      remaining: [{ productId: '507f1f77bcf86cd799439014', name: 'ball', qty: 2 }],
    }

    await appendMessages(session, 'red please', 'For **ball** I need color', null, queue)

    const reloaded = await ChatSession.findById(session._id)
    expect(sessionCartQueueForAssist(reloaded).remaining).toHaveLength(1)
    expect(reloaded.messages.at(-1).content).not.toContain('cart-queue')

    await appendMessages(reloaded, 'done', 'Added to cart', null, null)
    const cleared = await ChatSession.findById(session._id)
    expect(sessionCartQueueForAssist(cleared)).toBeNull()
  })
})
