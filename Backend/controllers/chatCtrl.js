import asyncHandler from 'express-async-handler'
import User from '../model/User.js'
import { chatCompletion } from '../services/llmService.js'
import { toolDefinitions, executeTool } from '../services/chatTools.js'
import {
  getSessionForUser,
  appendMessages,
  trimOldSessions,
  sessionHistoryForApi,
} from '../services/chatSessionService.js'
import { previewCheckout, checkoutFromCart } from '../services/checkoutFromCart.js'
import { runCheckoutAssist, isCheckoutProceedIntent } from '../services/chatCheckoutAssist.js'
import { buildSystemPrompt } from '../services/chatPrompt.js'

const MAX_TOOL_ROUNDS = 7

function collectClientActions(toolResults) {
  const actions = []
  const seen = new Set()

  for (const result of toolResults) {
    if (!result || typeof result !== 'object') continue
    if (result.clientAction === 'sync_cart' || result.cart) {
      if (!seen.has('sync_cart')) {
        actions.push({ type: 'sync_cart' })
        seen.add('sync_cart')
      }
    }
    if (result.checkoutUrl && !seen.has('open_checkout')) {
      actions.push({ type: 'open_checkout', url: result.checkoutUrl })
      seen.add('open_checkout')
      if (!seen.has('sync_cart')) {
        actions.push({ type: 'sync_cart' })
        seen.add('sync_cart')
      }
    }
  }

  return actions
}

function extractCartSummary(toolResults) {
  for (let i = toolResults.length - 1; i >= 0; i--) {
    const r = toolResults[i]
    const cart = r?.cart
    if (cart && typeof cart.itemCount === 'number') {
      return { itemCount: cart.itemCount, total: cart.total }
    }
  }
  return null
}
const MAX_HISTORY = 20

function parseToolContent(content) {
  try {
    return JSON.parse(content)
  } catch {
    return null
  }
}

function findLastProductCatalog(messages) {
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i]
    if (msg.role !== 'tool') continue
    const data = parseToolContent(msg.content)
    if (!data) continue
    if (Array.isArray(data.products)) {
      return {
        count: data.count ?? data.products.length,
        products: data.products,
        message: data.message,
        strictListing: true,
      }
    }
    if (Array.isArray(data) && data.length > 0 && data[0]?.name) {
      return { count: data.length, products: data }
    }
  }
  return null
}

function formatInr(price) {
  return `₹${Number(price).toLocaleString('en-IN')}`
}

function formatProductListBlock(searchResult) {
  const { products, count } = searchResult
  if (!count || !products?.length) {
    return searchResult.message || 'No matching products are in our catalog right now.'
  }
  return products
    .map((p, i) => {
      const url = p.productUrl || `/products/${p.id}`
      const stock = p.qtyLeft != null ? `${p.qtyLeft} in stock` : p.inStock ? 'In stock' : 'Out of stock'
      return `${i + 1}. **${p.name}** — ${formatInr(p.price)} · ${stock} · [View product](${url})`
    })
    .join('\n')
}

function isValidStripeCheckoutUrl(url) {
  return typeof url === 'string' && /^https:\/\/checkout\.stripe\.com\//i.test(url.trim())
}

/** Remove fake payment markup/URLs from model text — checkout uses CheckoutPaymentCard only. */
function sanitizeAssistantReply(reply) {
  if (!reply || typeof reply !== 'string') return reply
  return reply
    .replace(/<\/?[Bb]utton[^>]*>[\s\S]*?<\/[Bb]utton>/gi, '')
    .replace(/\[Pay[^\]]*\]\([^)]+\)/gi, '')
    .replace(/https?:\/\/(?:www\.)?stripe\.com[^\s)\]]*/gi, '')
    .replace(/https:\/\/checkout\.stripe\.com[^\s)\]]*/gi, '')
    .replace(/\[([^\]]+)\]\(\/addresses\/[^)]+\)/gi, '[My Profile](/customer-profile)')
    .replace(/\(\/addresses\/[^)]+\)/gi, '(/customer-profile)')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function buildCatalogBackedReply(searchResult) {
  const count = searchResult.count ?? 0
  if (count === 0) {
    return (
      searchResult.message ||
      "I couldn't find any products matching that in our catalog. Would you like me to try a different search?"
    )
  }

  const list = formatProductListBlock(searchResult)
  const intro =
    count === 1
      ? 'I found **1** product in our catalog that matches:'
      : `I found **${count}** products in our catalog that match:`

  return `${intro}\n\n${list}\n\nTap **View product** to see full details. Let me know if you need anything else.`
}

function buildCheckoutBackedReply(checkout) {
  return `Your checkout is ready for order **#${checkout.orderNumber}** (total ${formatInr(checkout.totalPrice)}).

Use the **Pay on Stripe** button shown below this message to pay securely. Do not use payment links in the chat text — only that button opens your order checkout.

Your cart has been cleared for this checkout.`
}

function isCheckoutConfirmation(text) {
  const normalized = String(text || '').trim().toLowerCase()
  if (isCheckoutProceedIntent(text)) return true
  return /^(yes|yeah|yep|yup|confirm|confirmed|proceed|ok|okay|sure|go ahead|pay|checkout)([.!?\s]|$)/.test(
    normalized
  )
}

function conversationMentionsCheckoutPending(messages) {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i]
    if (m.role === 'user') continue
    if (m.role === 'assistant') {
      return /checkout|proceed with payment|pay now|payment|stripe|ready for checkout|would you like to proceed/i.test(
        m.content || ''
      )
    }
  }
  return false
}

async function ensureCheckoutOnConfirm(userId, userText, messages, toolResults) {
  if (extractCheckoutInfo(toolResults)) return toolResults
  if (!isCheckoutConfirmation(userText)) return toolResults
  if (!conversationMentionsCheckoutPending(messages)) return toolResults

  try {
    const preview = await previewCheckout(userId, {})
    if (!preview.ready) return toolResults

    const session = await checkoutFromCart(userId, {})
    return [
      ...toolResults,
      {
        success: true,
        orderId: session.orderId,
        orderNumber: session.orderNumber,
        totalPrice: session.totalPrice,
        checkoutUrl: session.url,
        clientAction: 'open_checkout',
      },
    ]
  } catch (err) {
    console.error('Auto checkout on confirm failed:', err.message)
    return toolResults
  }
}

function applyCheckoutReply(reply, toolResults) {
  const checkout = extractCheckoutInfo(toolResults)
  if (checkout) {
    return buildCheckoutBackedReply(checkout)
  }
  return reply
}

function extractCheckoutInfo(toolResults) {
  for (let i = toolResults.length - 1; i >= 0; i--) {
    const r = toolResults[i]
    if (r?.checkoutUrl && isValidStripeCheckoutUrl(r.checkoutUrl)) {
      return {
        checkoutUrl: r.checkoutUrl.trim(),
        orderNumber: r.orderNumber,
        orderId: r.orderId,
        totalPrice: r.totalPrice,
      }
    }
  }
  return null
}

function buildChatResponse(reply, toolResults) {
  const payload = { success: true, reply }
  const clientActions = collectClientActions(toolResults)
  if (clientActions.length) {
    payload.clientActions = clientActions
  }
  const cartSummary = extractCartSummary(toolResults)
  if (cartSummary) {
    payload.cartSummary = cartSummary
  }
  const checkout = extractCheckoutInfo(toolResults)
  if (checkout) {
    payload.checkout = checkout
  }
  return payload
}

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

  const systemMessage = {
    role: 'system',
    content: buildSystemPrompt(user.fullname),
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
  const messages = [
    systemMessage,
    ...trimmedHistory,
    { role: 'user', content: userText },
  ]

  let response
  let round = 0
  const toolResults = []

  while (round < MAX_TOOL_ROUNDS) {
    round++
    response = await chatCompletion(messages, toolDefinitions)

    const choice = response.choices?.[0]
    if (!choice) throw new Error('No response from AI service')

    const assistantMessage = choice.message

    if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
      messages.push(assistantMessage)

      for (const toolCall of assistantMessage.tool_calls) {
        const fnName = toolCall.function.name
        let fnArgs = {}
        try {
          fnArgs = JSON.parse(toolCall.function.arguments || '{}')
        } catch {
          fnArgs = {}
        }

        const result = await executeTool(fnName, req.userAuthId, fnArgs)
        toolResults.push(result)

        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify(result),
        })
      }

      continue
    }

    let reply =
      assistantMessage.content || "I'm sorry, I couldn't generate a response. Please try again."

    const lastCatalog = findLastProductCatalog(messages)
    if (lastCatalog?.strictListing) {
      reply = buildCatalogBackedReply(lastCatalog)
    }

    return res.json(
      await persistAndRespond(
        session,
        userText,
        reply,
        toolResults,
        req.userAuthId,
        messages
      )
    )
  }

  const lastChoice = response?.choices?.[0]
  let reply =
    lastChoice?.message?.content ||
    "I'm sorry, I wasn't able to find what you're looking for. Could you try rephrasing your question? For example, you can ask me to search for a specific product name, check your orders, or find active coupons."

  const lastCatalog = findLastProductCatalog(messages)
  if (lastCatalog?.strictListing) {
    reply = buildCatalogBackedReply(lastCatalog)
  }

  res.json(
    await persistAndRespond(
      session,
      userText,
      reply,
      toolResults,
      req.userAuthId,
      messages
    )
  )
})

async function persistAndRespond(
  session,
  userText,
  reply,
  toolResults,
  userId,
  messages = []
) {
  const assist = await runCheckoutAssist(userId, userText, messages, toolResults)
  let finalToolResults = assist.toolResults
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
