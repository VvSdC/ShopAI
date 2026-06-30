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
  ensureSearchCatalogReply,
  resolveCatalogProductsForSession,
  applyBlockAwareReply,
} from '../services/chatPostProcess.js'
import { buildChatBlocks } from '../services/chatBlocks.js'
import { runWithLlmUsageContext, patchLlmUsageContext } from '../services/llmUsageContext.js'
import { runWithPurchaseIntentCache } from '../services/purchaseIntentContext.js'
import { recordChatRouteDecision } from '../services/llmUsageLogger.js'
import { CHAT_HISTORY_MAX_ITEMS } from '../constants/chatLimits.js'
import { runWithChatStream } from '../services/chatStreamContext.js'
import { initSseResponse, writeSseEvent } from '../services/chatStream.js'

function deriveMessageKind({ replyKind, toolResults = [], payload = {} }) {
  if (replyKind) return replyKind
  if (payload?.checkout?.checkoutUrl) return 'checkout_link'
  const names = (toolResults || []).map((r) => r?.toolName)
  if (names.includes('get_product_details')) return 'product_detail'
  if (names.includes('add_to_cart')) return 'cart_confirm'
  if (names.includes('get_cart')) return 'cart_summary'
  if (names.includes('get_my_addresses')) return 'address_picker'
  if (names.includes('save_address')) return 'address_saved'
  if (names.includes('search_products')) return 'product_listing'
  if (names.some((n) => /order/i.test(n || ''))) return 'order_summary'
  return null
}

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
  const {
    reply: assistedReply,
    toolResults,
    cartQueue,
    replyKind: assistReplyKind,
    replyLocked: assistReplyLocked,
  } = await runDeterministicChatAssist({
    userId,
    userText,
    history,
    graphResult,
    sessionCartQueue,
  })

  const replyKind = assistReplyKind || graphResult.replyKind || null
  const replyLocked = Boolean(assistReplyLocked || graphResult.replyLocked)

  const baseReply = replyLocked
    ? assistedReply
    : ensureSearchCatalogReply(assistedReply, toolResults, userText)

  const formattedReply = formatAgentReply(
    baseReply,
    graphResult.messages || [],
    userText,
    toolResults,
    history,
    { plan: graphResult.plan || null, replyKind, replyLocked }
  )
  let reply = sanitizeAssistantReply(applyCheckoutReply(formattedReply, toolResults))
  const messageKind = deriveMessageKind({ replyKind, toolResults, payload: {} })
  const blocks = buildChatBlocks({ toolResults, messageKind })
  if (blocks.length) {
    reply = sanitizeAssistantReply(applyBlockAwareReply(reply, blocks, toolResults, userText))
  }
  const payload = buildChatResponse(reply, toolResults, blocks.length ? { blocks } : {})
  const cartQueuePatch = cartQueue !== undefined ? cartQueue : undefined
  const catalogToSave = resolveCatalogProductsForSession(toolResults, reply)
  const finalMessageKind = deriveMessageKind({ replyKind, toolResults, payload })
  await appendMessages(
    session,
    userText,
    reply,
    payload.checkout || null,
    cartQueuePatch,
    catalogToSave.length ? catalogToSave : null,
    {
      messageKind: finalMessageKind,
      language: graphResult.language || null,
      userLanguage: graphResult.language || null,
      blocks: blocks.length ? blocks : null,
    }
  )
  await maybeTrimOldSessions(userId)
  payload.sessionId = String(session._id)
  payload.sessionTitle = session.title
  return payload
}
