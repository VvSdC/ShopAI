import asyncHandler from 'express-async-handler'
import User from '../model/User.js'
import {
  getSessionForUser,
  appendMessages,
  trimOldSessions,
  sessionHistoryForApi,
} from '../services/chatSessionService.js'
import { runCheckoutAssist } from '../services/chatCheckoutAssist.js'
import { runCartAssist } from '../services/chatCartAssist.js'
import { runAddressAssist } from '../services/chatAddressAssist.js'
import { runChatGraph } from '../services/chatGraph/index.js'
import {
  buildChatResponse,
  sanitizeAssistantReply,
  applyCheckoutReply,
  ensureCheckoutOnConfirm,
} from '../services/chatPostProcess.js'

const MAX_HISTORY = 20

export const chatMessageCtrl = asyncHandler(async (req, res) => {
  const { message, history, sessionId } = req.body

  if (!message || typeof message !== 'string' || !message.trim()) {
    res.status(400)
    throw new Error('Message is required')
  }

  const user = await User.findById(req.userAuthId).select('fullname')
  if (!user) {
    res.status(401)
    throw new Error('User not found')
  }

  let session = null
  if (sessionId) {
    session = await getSessionForUser(req.userAuthId, sessionId)
    if (!session) {
      res.status(404)
      throw new Error('Conversation not found')
    }
  }

  const trimmedHistory = session
    ? sessionHistoryForApi(session, MAX_HISTORY)
    : Array.isArray(history)
      ? history.slice(-MAX_HISTORY).map((m) => ({
          role: m.role === 'user' ? 'user' : 'assistant',
          content: String(m.content || ''),
        }))
      : []

  const userText = message.trim()
  const graphResult = await runChatGraph({
    userId: req.userAuthId,
    userName: user.fullname,
    userText,
    history: trimmedHistory,
  })

  res.json(
    await persistAndRespond(
      session,
      userText,
      graphResult,
      req.userAuthId,
      trimmedHistory
    )
  )
})

async function persistAndRespond(session, userText, graphResult, userId, history = []) {
  let reply = graphResult.reply
  let toolResults = graphResult.toolResults || []
  const messages = graphResult.messages || []

  const cartAssist = await runCartAssist(userId, userText, history, toolResults, {
    route: graphResult.route,
  })
  let finalToolResults = cartAssist.toolResults
  if (cartAssist.reply) {
    reply = cartAssist.reply
  }

  const addressAssist = await runAddressAssist(userId, userText, finalToolResults)
  finalToolResults = addressAssist.toolResults
  if (addressAssist.reply) {
    reply = addressAssist.reply
  }

  const assist = await runCheckoutAssist(userId, userText, history, finalToolResults)
  finalToolResults = assist.toolResults
  if (assist.reply) {
    reply = assist.reply
  }

  finalToolResults = await ensureCheckoutOnConfirm(
    userId,
    userText,
    messages,
    finalToolResults
  )
  reply = sanitizeAssistantReply(applyCheckoutReply(reply, finalToolResults))
  const payload = buildChatResponse(reply, finalToolResults)
  if (session) {
    await appendMessages(session, userText, reply, payload.checkout || null)
    await trimOldSessions(userId)
    payload.sessionId = String(session._id)
    payload.sessionTitle = session.title
  }
  return payload
}
