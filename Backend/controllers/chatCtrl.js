import asyncHandler from 'express-async-handler'
import User from '../model/User.js'
import {
  getSessionForUser,
  createSession,
  appendMessages,
  maybeTrimOldSessions,
  sessionHistoryForApi,
  sessionCartQueueForAssist,
} from '../services/chatSessionService.js'
import { runChatGraph } from '../services/chatGraph/index.js'
import { runDeterministicChatAssist } from '../services/chatDeterministicAssist.js'
import {
  buildChatResponse,
  sanitizeAssistantReply,
  applyCheckoutReply,
} from '../services/chatPostProcess.js'
import { runWithLlmUsageContext, patchLlmUsageContext } from '../services/llmUsageContext.js'
import { recordChatRouteDecision } from '../services/llmUsageLogger.js'
import { CHAT_HISTORY_MAX_ITEMS } from '../constants/chatLimits.js'

export const chatMessageCtrl = asyncHandler(async (req, res) => {
  const { message, sessionId } = req.body

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
  } else {
    session = await createSession(req.userAuthId, user.fullname)
  }

  const trimmedHistory = sessionHistoryForApi(session, CHAT_HISTORY_MAX_ITEMS)

  const userText = message

  const payload = await runWithLlmUsageContext(
    {
      source: 'chat',
      userId: req.userAuthId,
      sessionId: session ? String(session._id) : null,
    },
    async () => {
      const graphResult = await runChatGraph({
        userId: req.userAuthId,
        userName: user.fullname,
        userText,
        history: trimmedHistory,
        historyPrepared: true,
      })
      patchLlmUsageContext({
        route: graphResult.route || null,
        routeReason: graphResult.routeReason || null,
      })
      recordChatRouteDecision({
        route: graphResult.route,
        routeReason: graphResult.routeReason,
      })
      return persistAndRespond(
        session,
        userText,
        graphResult,
        req.userAuthId,
        trimmedHistory,
        sessionCartQueueForAssist(session)
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
  const { reply: assistedReply, toolResults, cartQueue } = await runDeterministicChatAssist({
    userId,
    userText,
    history,
    graphResult,
    sessionCartQueue,
  })

  const reply = sanitizeAssistantReply(applyCheckoutReply(assistedReply, toolResults))
  const payload = buildChatResponse(reply, toolResults)
  const cartQueuePatch = cartQueue !== undefined ? cartQueue : undefined
  await appendMessages(session, userText, reply, payload.checkout || null, cartQueuePatch)
  await maybeTrimOldSessions(userId)
  payload.sessionId = String(session._id)
  payload.sessionTitle = session.title
  return payload
}
