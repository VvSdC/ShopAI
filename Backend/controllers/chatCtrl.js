import asyncHandler from 'express-async-handler'
import User from '../model/User.js'
import {
  getSessionForUser,
  appendMessages,
  trimOldSessions,
  sessionHistoryForApi,
  sessionCartQueueForAssist,
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
import { runWithLlmUsageContext, patchLlmUsageContext } from '../services/llmUsageContext.js'
import { CHAT_HISTORY_MAX_ITEMS } from '../constants/chatLimits.js'

export const chatMessageCtrl = asyncHandler(async (req, res) => {
  const { message, history, sessionId } = req.body

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
    ? sessionHistoryForApi(session, CHAT_HISTORY_MAX_ITEMS)
    : (history || []).map((m) => ({
        role: m.role,
        content: m.content,
      }))

  const userText = message

  const payload = await runWithLlmUsageContext(
    {
      source: 'chat',
      userId: req.userAuthId,
      sessionId: session ? String(session._id) : null,
      agentPromptCache: new Map(),
    },
    async () => {
      const graphResult = await runChatGraph({
        userId: req.userAuthId,
        userName: user.fullname,
        userText,
        history: trimmedHistory,
      })
      patchLlmUsageContext({ route: graphResult.route || null })
      return persistAndRespond(
        session,
        userText,
        graphResult,
        req.userAuthId,
        trimmedHistory,
        session ? sessionCartQueueForAssist(session) : null
      )
    }
  )

  res.json(payload)
})

async function persistAndRespond(
  session,
  userText,
  graphResult,
  userId,
  history = [],
  sessionCartQueue = null
) {
  let reply = graphResult.reply
  let toolResults = graphResult.toolResults || []
  const messages = graphResult.messages || []

  const cartAssist = await runCartAssist(userId, userText, history, toolResults, {
    route: graphResult.route,
    cartQueue: sessionCartQueue,
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
    const cartQueuePatch =
      cartAssist.cartQueue !== undefined ? cartAssist.cartQueue : undefined
    await appendMessages(session, userText, reply, payload.checkout || null, cartQueuePatch)
    await trimOldSessions(userId)
    payload.sessionId = String(session._id)
    payload.sessionTitle = session.title
  }
  return payload
}
