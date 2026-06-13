import ChatSession from '../model/ChatSession.js'
import {
  CHAT_HISTORY_MAX_ITEMS,
  CHAT_MESSAGE_MAX_LENGTH,
  CHAT_SESSION_CLIENT_PAGE_SIZE,
} from '../constants/chatLimits.js'
import { clampChatText, clampSessionMessageText } from '../utils/chatMessageLimits.js'
import { trimHistoryToTokenBudget } from '../utils/chatHistoryTrim.js'
import { CHAT_HISTORY_TOKEN_BUDGET } from '../constants/chatLimits.js'
import { normalizeCartQueue, stripCartQueueMarker } from './cartQueue.js'

export const MAX_SESSIONS_PER_USER = 50
export const MAX_MESSAGES_PER_SESSION = 100

export function buildWelcomeMessage(userName) {
  const name = userName || 'there'
  return `Hi ${name}! 👋 I'm an **AI shopping assistant**. I can help you find products, update your cart, and checkout.

What are you looking for today?`
}

export function deriveSessionTitle(text) {
  const cleaned = String(text || '')
    .trim()
    .replace(/\s+/g, ' ')
  if (!cleaned) return 'New conversation'
  return cleaned.length > 48 ? `${cleaned.slice(0, 48)}…` : cleaned
}

export async function listSessions(userId, { limit = 30 } = {}) {
  const sessions = await ChatSession.find({ user: userId })
    .select('title updatedAt createdAt messageCount')
    .select({ messages: { $slice: -1 } })
    .sort({ updatedAt: -1 })
    .limit(Math.min(limit, MAX_SESSIONS_PER_USER))
    .lean()

  return sessions.map((session) => {
    const lastMessage = session.messages?.[0]
    const messageCount =
      session.messageCount ??
      (lastMessage ? 1 : 0)

    return {
      id: String(session._id),
      title: session.title,
      updatedAt: session.updatedAt,
      createdAt: session.createdAt,
      messageCount,
      preview: lastMessage?.content ? String(lastMessage.content).slice(0, 80) : '',
    }
  })
}

export async function getSessionForUser(userId, sessionId) {
  const session = await ChatSession.findOne({ _id: sessionId, user: userId })
  if (!session) return null
  return session
}

/**
 * Paginated session messages for the client (newest page first).
 * @param {string} userId
 * @param {string} sessionId
 * @param {{ beforeMessageId?: string, limit?: number }} [options]
 *   `beforeMessageId` — `_id` of the oldest message the client already shows; returns older pages.
 */
export async function getSessionMessagesForClient(
  userId,
  sessionId,
  { beforeMessageId, limit = CHAT_SESSION_CLIENT_PAGE_SIZE } = {}
) {
  const session = await ChatSession.findOne({ _id: sessionId, user: userId })
    .select('title updatedAt createdAt messageCount messages')
    .lean()

  if (!session) return null

  const messages = session.messages || []
  const total = session.messageCount ?? messages.length
  const pageSize = Math.min(
    Math.max(1, Number(limit) || CHAT_SESSION_CLIENT_PAGE_SIZE),
    50
  )

  let pageMessages
  let hasMoreOlder

  if (beforeMessageId) {
    const cursorIndex = messages.findIndex(
      (message) => String(message._id) === String(beforeMessageId)
    )
    if (cursorIndex === -1) {
      pageMessages = []
      hasMoreOlder = false
    } else {
      const start = Math.max(0, cursorIndex - pageSize)
      pageMessages = messages.slice(start, cursorIndex)
      hasMoreOlder = start > 0
    }
  } else {
    pageMessages = messages.slice(-pageSize)
    hasMoreOlder = messages.length > pageSize
  }

  return {
    id: String(session._id),
    title: session.title,
    updatedAt: session.updatedAt,
    createdAt: session.createdAt,
    messageCount: total,
    messages: pageMessages,
    hasMoreOlder,
  }
}

export function mapClientSessionPayload(sessionData) {
  return {
    id: sessionData.id,
    title: sessionData.title,
    updatedAt: sessionData.updatedAt,
    createdAt: sessionData.createdAt,
    messageCount: sessionData.messageCount,
    hasMoreOlder: sessionData.hasMoreOlder,
    messages: (sessionData.messages || []).map(mapSessionMessageForClient),
  }
}

export async function createSession(userId, userName) {
  const welcome = buildWelcomeMessage(userName)
  const session = await ChatSession.create({
    user: userId,
    title: 'New conversation',
    messageCount: 1,
    messages: [{ role: 'assistant', content: welcome }],
  })
  return session
}

export async function deleteSession(userId, sessionId) {
  const result = await ChatSession.deleteOne({ _id: sessionId, user: userId })
  return result.deletedCount > 0
}

export async function appendMessages(
  session,
  userContent,
  assistantContent,
  checkout = null,
  cartQueue = undefined
) {
  const userEntry = {
    role: 'user',
    content: clampSessionMessageText(userContent),
  }

  const assistantEntry = {
    role: 'assistant',
    content: clampSessionMessageText(stripCartQueueMarker(assistantContent)),
  }
  if (checkout?.checkoutUrl) {
    assistantEntry.checkout = {
      checkoutUrl: checkout.checkoutUrl,
      orderNumber: checkout.orderNumber,
      orderId: checkout.orderId,
      totalPrice: checkout.totalPrice,
    }
  }

  const priorCount = session.messageCount ?? session.messages?.length ?? 0
  const shouldUpdateTitle =
    !session.messages?.length || session.title === 'New conversation'

  const update = {
    $push: {
      messages: {
        $each: [userEntry, assistantEntry],
        $slice: -MAX_MESSAGES_PER_SESSION,
      },
    },
    $set: {
      messageCount: Math.min(priorCount + 2, MAX_MESSAGES_PER_SESSION),
    },
  }

  if (shouldUpdateTitle) {
    update.$set.title = deriveSessionTitle(userContent)
  }

  if (cartQueue !== undefined) {
    update.$set.cartQueue = normalizeCartQueue(cartQueue)
  }

  const updated = await ChatSession.findByIdAndUpdate(session._id, update, {
    new: true,
  })

  if (updated) {
    session.title = updated.title
    session.messages = updated.messages
    session.messageCount = updated.messageCount
    session.cartQueue = updated.cartQueue
    session.updatedAt = updated.updatedAt
    return updated
  }

  return session
}

export function mapSessionMessageForClient(message) {
  const out = {
    id: message._id ? String(message._id) : undefined,
    role: message.role,
    content: stripCartQueueMarker(message.content),
    createdAt: message.createdAt,
  }
  if (message.checkout?.checkoutUrl) {
    out.checkout = {
      checkoutUrl: message.checkout.checkoutUrl,
      orderNumber: message.checkout.orderNumber,
      orderId: message.checkout.orderId,
      totalPrice: message.checkout.totalPrice,
    }
  }
  return out
}

export async function trimOldSessions(userId) {
  const sessions = await ChatSession.find({ user: userId })
    .select('_id')
    .sort({ updatedAt: -1 })
    .skip(MAX_SESSIONS_PER_USER)

  if (!sessions.length) return
  const ids = sessions.map((s) => s._id)
  await ChatSession.deleteMany({ _id: { $in: ids } })
}

/** Trim only when the user exceeds the session cap — avoids a full scan on every message. */
export async function maybeTrimOldSessions(userId) {
  const count = await ChatSession.countDocuments({ user: userId })
  if (count <= MAX_SESSIONS_PER_USER) return
  await trimOldSessions(userId)
}

export function sessionHistoryForApi(
  session,
  maxMessages = CHAT_HISTORY_MAX_ITEMS,
  tokenBudget = CHAT_HISTORY_TOKEN_BUDGET
) {
  const mapped = (session?.messages || [])
    .slice(-maxMessages)
    .map((m) => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: clampChatText(stripCartQueueMarker(m.content), CHAT_MESSAGE_MAX_LENGTH),
    }))
  return trimHistoryToTokenBudget(mapped, tokenBudget)
}

export function sessionCartQueueForAssist(session) {
  return normalizeCartQueue(session?.cartQueue)
}
