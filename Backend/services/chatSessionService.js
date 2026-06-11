import ChatSession from '../model/ChatSession.js'
import { CHAT_HISTORY_MAX_ITEMS, CHAT_MESSAGE_MAX_LENGTH } from '../constants/chatLimits.js'
import { clampChatText, clampSessionMessageText } from '../utils/chatMessageLimits.js'
import { normalizeCartQueue, stripCartQueueMarker } from './cartQueue.js'

const MAX_SESSIONS_PER_USER = 50
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
    .select('title updatedAt createdAt messages')
    .sort({ updatedAt: -1 })
    .limit(Math.min(limit, MAX_SESSIONS_PER_USER))

  return sessions.map((session) => ({
    id: String(session._id),
    title: session.title,
    updatedAt: session.updatedAt,
    createdAt: session.createdAt,
    messageCount: session.messages?.length || 0,
    preview:
      session.messages?.length > 0
        ? session.messages[session.messages.length - 1].content.slice(0, 80)
        : '',
  }))
}

export async function getSessionForUser(userId, sessionId) {
  const session = await ChatSession.findOne({ _id: sessionId, user: userId })
  if (!session) return null
  return session
}

export async function createSession(userId, userName) {
  const welcome = buildWelcomeMessage(userName)
  const session = await ChatSession.create({
    user: userId,
    title: 'New conversation',
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

export function sessionHistoryForApi(session, maxMessages = CHAT_HISTORY_MAX_ITEMS) {
  return (session?.messages || [])
    .slice(-maxMessages)
    .map((m) => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: clampChatText(stripCartQueueMarker(m.content), CHAT_MESSAGE_MAX_LENGTH),
    }))
}

export function sessionCartQueueForAssist(session) {
  return normalizeCartQueue(session?.cartQueue)
}
