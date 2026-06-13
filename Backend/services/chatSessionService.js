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
const MAX_MESSAGES_PER_SESSION = 100

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
 * @param {{ before?: number, limit?: number }} [options]
 *   `before` — how many newest messages the client already has (0 on first open).
 */
export async function getSessionMessagesForClient(
  userId,
  sessionId,
  { before = 0, limit = CHAT_SESSION_CLIENT_PAGE_SIZE } = {}
) {
  const meta = await ChatSession.findOne({ _id: sessionId, user: userId })
    .select('title updatedAt createdAt messageCount')
    .lean()

  if (!meta) return null

  const total = meta.messageCount ?? 0
  const alreadyFromEnd = Math.max(0, Number(before) || 0)
  const pageSize = Math.min(
    Math.max(1, Number(limit) || CHAT_SESSION_CLIENT_PAGE_SIZE),
    50
  )

  if (alreadyFromEnd >= total) {
    return {
      id: String(meta._id),
      title: meta.title,
      updatedAt: meta.updatedAt,
      createdAt: meta.createdAt,
      messageCount: total,
      messages: [],
      hasMoreOlder: false,
      loadedFromEnd: alreadyFromEnd,
    }
  }

  const remaining = total - alreadyFromEnd
  const take = Math.min(pageSize, remaining)
  const skip = Math.max(0, total - alreadyFromEnd - take)

  const sliced = await ChatSession.findOne({ _id: sessionId, user: userId })
    .select({ messages: { $slice: [skip, take] } })
    .lean()

  return {
    id: String(meta._id),
    title: meta.title,
    updatedAt: meta.updatedAt,
    createdAt: meta.createdAt,
    messageCount: total,
    messages: sliced?.messages || [],
    hasMoreOlder: skip > 0,
    loadedFromEnd: alreadyFromEnd + take,
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
    loadedFromEnd: sessionData.loadedFromEnd,
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
  if (!session.messages?.length) {
    session.title = deriveSessionTitle(userContent)
  } else if (session.title === 'New conversation') {
    session.title = deriveSessionTitle(userContent)
  }

  session.messages.push({
    role: 'user',
    content: clampSessionMessageText(userContent),
  })

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
  session.messages.push(assistantEntry)

  if (session.messages.length > MAX_MESSAGES_PER_SESSION) {
    session.messages = session.messages.slice(-MAX_MESSAGES_PER_SESSION)
  }

  session.messageCount = session.messages.length

  if (cartQueue !== undefined) {
    session.cartQueue = normalizeCartQueue(cartQueue)
  }

  await session.save()
  return session
}

export function mapSessionMessageForClient(message) {
  const out = {
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
