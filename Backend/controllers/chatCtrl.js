import asyncHandler from 'express-async-handler'
import User from '../model/User.js'
import { AppError } from '../utils/appError.js'
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
import { prepareChatHistoryForLlm } from '../utils/chatHistoryTrim.js'
import { GUEST_USER_ID, runWithGuestCart } from '../services/guestCartContext.js'
import { createGuestCartState } from '../services/guestCartService.js'
import { isCheckoutProceedIntent } from '../services/chatIntentHelpers.js'
import {
  hasSignInRequiredResult,
  applySignInRequiredToPayload,
} from '../services/guestChatRestrictions.js'

function deriveMessageKind({ replyKind, toolResults = [], payload = {} }) {
  if (replyKind) return replyKind
  if (payload?.checkout?.checkoutUrl) return 'checkout_link'
  const names = (toolResults || []).map((r) => r?.toolName)
  if (names.includes('product_disambiguation')) return 'product_listing'
  if (names.includes('get_product_details')) return 'product_detail'
  if (names.includes('add_to_cart')) return 'cart_confirm'
  if (names.includes('get_cart')) return 'cart_summary'
  if (names.includes('get_my_addresses')) return 'address_picker'
  if (names.includes('save_address')) return 'address_saved'
  if (names.some((r) => r?.signInRequired || r?.error === 'sign_in_required')) {
    return 'sign_in_required'
  }
  if (names.includes('search_products')) return 'product_listing'
  if (names.some((n) => /order/i.test(n || ''))) return 'order_summary'
  return null
}

function chatStreamErrorPayload(err) {
  const status = err?.statusCode || err?.status || 500
  const message = err?.message || 'Chat stream failed'
  let code = 'chat_failed'
  if (status === 429 || /rate limit/i.test(message)) code = 'rate_limited'
  else if (status === 401 || status === 403) code = 'auth_required'
  else if (status === 404) code = 'not_found'
  else if (status >= 500) code = 'server_error'
  else if (/stream ended without/i.test(message)) code = 'stream_incomplete'
  return { code, message }
}

async function resolveChatSession(userId, userName, sessionId) {
  if (sessionId) {
    const session = await getSessionForUser(userId, sessionId)
    if (!session) {
      throw new AppError('Conversation not found', 404)
    }
    return session
  }
  return createSession(userId, userName)
}

export const chatMessageCtrl = asyncHandler(async (req, res) => {
  const { message, sessionId } = req.body

  const user = await User.findById(req.userAuthId).select('fullname')
  if (!user) {
    throw new AppError('User not found', 401)
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
    throw new AppError('User not found', 401)
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
    writeSseEvent(res, 'error', chatStreamErrorPayload(err))
    res.end()
  }
})

export const guestChatMessageStreamCtrl = asyncHandler(async (req, res) => {
  const { message, history = [], localCart = [] } = req.body
  const trimmedHistory = prepareChatHistoryForLlm(history)
  const guestCartState = createGuestCartState(localCart)
  const userText = message

  initSseResponse(res)
  const emit = (event) => writeSseEvent(res, event.type, event)

  try {
    const payload = await runWithLlmUsageContext(
      { source: 'chat-guest', userId: null, sessionId: null },
      () =>
        runWithGuestCart(guestCartState, () =>
          runWithPurchaseIntentCache(() =>
            runWithChatStream(emit, async () => {
              const graphResult = await runChatGraph({
                userId: GUEST_USER_ID,
                userName: 'Guest',
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
              const built = await buildChatPayloadFromGraph({
                userText,
                graphResult,
                userId: GUEST_USER_ID,
                history: trimmedHistory,
              })
              built.guest = true
              built.localCart = guestCartState.items

              if (
                isCheckoutProceedIntent(userText, trimmedHistory) &&
                !built.checkout &&
                !hasSignInRequiredResult(built.toolResults)
              ) {
                return applySignInRequiredToPayload(built, userText, { route: 'checkout' })
              }

              if (hasSignInRequiredResult(built.toolResults)) {
                return applySignInRequiredToPayload(built, userText, {
                  route: graphResult.route || null,
                })
              }

              return built
            })
          )
        )
    )

    writeSseEvent(res, 'done', payload)
    res.end()
  } catch (err) {
    writeSseEvent(res, 'error', chatStreamErrorPayload(err))
    res.end()
  }
})

async function buildChatPayloadFromGraph({
  userText,
  graphResult,
  userId,
  history = [],
  sessionCartQueue = null,
  skipAssist = false,
  assistResult = null,
}) {
  const assisted = skipAssist
    ? assistResult
    : await runDeterministicChatAssist({
        userId,
        userText,
        history,
        graphResult,
        sessionCartQueue,
      })

  const toolResults = assisted.toolResults
  const replyKind = assisted.replyKind || graphResult.replyKind || null
  const replyLocked = Boolean(assisted.replyLocked || graphResult.replyLocked)
  const assistedReply = assisted.reply

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
  const blocks = buildChatBlocks({
    toolResults,
    messageKind,
    pendingQuery: userText,
    suggestPrompts: Boolean(assisted.suggestPrompts),
  })
  if (blocks.length) {
    reply = sanitizeAssistantReply(applyBlockAwareReply(reply, blocks, toolResults, userText))
  }
  const payload = buildChatResponse(reply, toolResults, blocks.length ? { blocks } : {})
  payload.toolResults = toolResults
  if (hasSignInRequiredResult(toolResults)) {
    payload.signInRequired = true
    payload.pendingQuery = userText
  }
  return payload
}

async function persistAndRespond(
  session,
  userText,
  graphResult,
  userId,
  history = [],
  sessionCartQueue = null
) {
  const assistResult = await runDeterministicChatAssist({
    userId,
    userText,
    history,
    graphResult,
    sessionCartQueue,
  })

  const payload = await buildChatPayloadFromGraph({
    userText,
    graphResult: {
      ...graphResult,
      reply: assistResult.reply,
      toolResults: assistResult.toolResults,
      replyKind: assistResult.replyKind,
      replyLocked: assistResult.replyLocked,
    },
    userId,
    history,
    sessionCartQueue,
    skipAssist: true,
    assistResult,
  })

  const replyKind = assistResult.replyKind || graphResult.replyKind || null
  const cartQueuePatch = assistResult.cartQueue !== undefined ? assistResult.cartQueue : undefined
  const catalogToSave = resolveCatalogProductsForSession(
    assistResult.toolResults || [],
    payload.reply
  )
  const finalMessageKind = deriveMessageKind({
    replyKind,
    toolResults: assistResult.toolResults,
    payload,
  })
  await appendMessages(
    session,
    userText,
    payload.reply,
    payload.checkout || null,
    cartQueuePatch,
    catalogToSave.length ? catalogToSave : null,
    {
      messageKind: finalMessageKind,
      language: graphResult.language || null,
      userLanguage: graphResult.language || null,
      blocks: payload.blocks?.length ? payload.blocks : null,
    }
  )
  await maybeTrimOldSessions(userId)
  payload.sessionId = String(session._id)
  payload.sessionTitle = session.title
  return payload
}
