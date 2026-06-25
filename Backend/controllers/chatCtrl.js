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
  formatAgentReply,
} from '../services/chatPostProcess.js'
import { runWithLlmUsageContext, patchLlmUsageContext } from '../services/llmUsageContext.js'
import { runWithPurchaseIntentCache } from '../services/purchaseIntentContext.js'
import { recordChatRouteDecision } from '../services/llmUsageLogger.js'
import { CHAT_HISTORY_MAX_ITEMS } from '../constants/chatLimits.js'
import { runWithChatStream } from '../services/chatStreamContext.js'
import { initSseResponse, writeSseEvent } from '../services/chatStream.js'

async function resolveChatSession(userId, userName, sessionId) {
  if (sessionId) {
    const session = await getSessionForUser(userId, sessionId)
    if (!session) {
      const err = new Error('Conversation not found')
      err.statusCode = 404
      throw err
    }
    return session
  }
  return createSession(userId, userName)
}

export const chatMessageCtrl = asyncHandler(async (req, res) => {
  const { message, sessionId } = req.body

  const user = await User.findById(req.userAuthId).select('fullname')
  if (!user) {
    res.status(401)
    throw new Error('User not found')
  }

  const session = await resolveChatSession(req.userAuthId, user.fullname, sessionId)
  const trimmedHistory = sessionHistoryForApi(session, CHAT_HISTORY_MAX_ITEMS)
  const userText = message

  const payload = await runWithLlmUsageContext(
    {
      source: 'chat',
      userId: req.userAuthId,
      sessionId: session ? String(session._id) : null,
    },
    () =>
      runWithPurchaseIntentCache(async () => {
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
      })
  )

  res.json(payload)
})

export const chatMessageStreamCtrl = asyncHandler(async (req, res) => {
  const { message, sessionId } = req.body

  const user = await User.findById(req.userAuthId).select('fullname')
  if (!user) {
    res.status(401)
    throw new Error('User not found')
  }

  let session
  try {
    session = await resolveChatSession(req.userAuthId, user.fullname, sessionId)
  } catch (err) {
    res.status(err.statusCode || 500)
    throw err
  }

  const trimmedHistory = sessionHistoryForApi(session, CHAT_HISTORY_MAX_ITEMS)
  const userText = message

  initSseResponse(res)

  const emit = (event) => writeSseEvent(res, event.type, event)

  try {
    const payload = await runWithLlmUsageContext(
      {
        source: 'chat',
        userId: req.userAuthId,
        sessionId: session ? String(session._id) : null,
      },
      () =>
        runWithPurchaseIntentCache(() =>
          runWithChatStream(emit, async () => {
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
          })
        )
    )

    writeSseEvent(res, 'done', payload)
    res.end()
  } catch (err) {
    writeSseEvent(res, 'error', {
      message: err.message || 'Chat stream failed',
    })
    res.end()
  }
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

  const formattedReply = formatAgentReply(
    assistedReply,
    graphResult.messages || [],
    userText,
    toolResults
  )
  const reply = sanitizeAssistantReply(applyCheckoutReply(formattedReply, toolResults))
  const payload = buildChatResponse(reply, toolResults)
  const cartQueuePatch = cartQueue !== undefined ? cartQueue : undefined
  await appendMessages(session, userText, reply, payload.checkout || null, cartQueuePatch)
  await maybeTrimOldSessions(userId)
  payload.sessionId = String(session._id)
  payload.sessionTitle = session.title
  return payload
}
