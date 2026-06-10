import { previewCheckout, checkoutFromCart } from './checkoutFromCart.js'
import {
  isCheckoutProceedIntent,
  conversationMentionsCheckoutPending,
} from './chatIntentHelpers.js'
import { isKitBundleQuery } from './chatGraph/productContext.js'

export function collectClientActions(toolResults) {
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

export function extractCartSummary(toolResults) {
  for (let i = toolResults.length - 1; i >= 0; i--) {
    const r = toolResults[i]
    const cart = r?.cart
    if (cart && typeof cart.itemCount === 'number') {
      return { itemCount: cart.itemCount, total: cart.total }
    }
  }
  return null
}

export function parseToolContent(content) {
  try {
    return JSON.parse(content)
  } catch {
    return null
  }
}

export function findLastProductCatalog(messages) {
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

export function formatInr(price) {
  return `₹${Number(price).toLocaleString('en-IN')}`
}

export function formatProductListBlock(searchResult) {
  const { products, count } = searchResult
  if (!count || !products?.length) {
    return searchResult.message || 'No matching products are in our catalog right now.'
  }
  return products
    .map((p, i) => {
      const url = p.productUrl || `/products/${p.id}`
      const stock =
        p.qtyLeft != null ? `${p.qtyLeft} in stock` : p.inStock ? 'In stock' : 'Out of stock'
      return `${i + 1}. **${p.name}** — ${formatInr(p.price)} · ${stock} · [View product](${url})`
    })
    .join('\n')
}

export function isValidStripeCheckoutUrl(url) {
  return typeof url === 'string' && /^https:\/\/checkout\.stripe\.com\//i.test(url.trim())
}

export function sanitizeAssistantReply(reply) {
  if (!reply || typeof reply !== 'string') return reply
  return reply
    .replace(/<\/?[Bb]utton[^>]*>[\s\S]*?<\/[Bb]utton>/gi, '')
    .replace(/\[Pay[^\]]*\]\([^)]+\)/gi, '')
    .replace(/https?:\/\/(?:www\.)?stripe\.com[^\s)\]]*/gi, '')
    .replace(/https:\/\/checkout\.stripe\.com[^\s)\]]*/gi, '')
    .replace(/\[([^\]]+)\]\(\/addresses\/[^)]+\)/gi, '[My Profile](/customer-profile)')
    .replace(/\(\/addresses\/[^)]+\)/gi, '(/customer-profile)')
    .replace(/\[([^\]]+)\]\(\/checkout[^)]*\)/gi, '$1')
    .replace(/\[([^\]]+)\]\(\/cart[^)]*\)/gi, '$1')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export function buildCatalogBackedReply(searchResult, { kitQuery = false } = {}) {
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

  const kitNote = kitQuery
    ? "We don't have a single pre-made **kit** in our catalog, but you can combine these items:\n\n"
    : ''

  const outro = kitQuery
    ? 'Tell me which items to add (e.g. *Add the bat and leather ball, 2 each*) or tap **View product** for details.'
    : 'Tap **View product** to see full details. Tell me which items to add, with size, color, and quantity when needed.'

  return `${kitNote}${intro}\n\n${list}\n\n${outro}`
}

export function applyKitSearchReply(reply, userText) {
  if (!isKitBundleQuery(userText)) return reply
  if (/pre-made \*\*kit\*\*/i.test(reply)) return reply
  if (!/I found \*\*\d+\*\* product/i.test(reply)) return reply
  return reply.replace(
    /^/,
    "We don't have a single pre-made **kit** in our catalog, but you can combine these items:\n\n"
  )
}

export function buildCheckoutBackedReply(checkout) {
  return `Your checkout is ready for order **#${checkout.orderNumber}** (total ${formatInr(checkout.totalPrice)}).

Use the **Pay on Stripe** button shown below this message to pay securely. Do not use payment links in the chat text — only that button opens your order checkout.

Your cart has been cleared for this checkout.`
}

export function isCheckoutConfirmation(text, messages = []) {
  const normalized = String(text || '').trim().toLowerCase()
  if (isCheckoutProceedIntent(text, messages)) return true
  return /^(yes|yeah|yep|yup|confirm|confirmed|proceed|ok|okay|sure|go ahead|pay|checkout)([.!?\s]|$)/.test(
    normalized
  )
}

export function extractCheckoutInfo(toolResults) {
  for (let i = toolResults.length - 1; i >= 0; i--) {
    const r = toolResults[i]
    if (r?.checkoutUrl && isValidStripeCheckoutUrl(r.checkoutUrl)) {
      return {
        checkoutUrl: r.checkoutUrl.trim(),
        orderNumber: r.orderNumber,
        orderId: r.orderId,
        totalPrice: r.totalPrice,
        expiresAt: r.expiresAt || null,
        source: r.checkoutSource || 'chat',
      }
    }
  }
  return null
}

export async function ensureCheckoutOnConfirm(userId, userText, messages, toolResults) {
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
        checkoutSource: session.checkoutSource || 'chat',
        expiresAt: session.expiresAt,
        clientAction: 'open_checkout',
      },
    ]
  } catch (err) {
    console.error('Auto checkout on confirm failed:', err.message)
    return toolResults
  }
}

export function applyCheckoutReply(reply, toolResults) {
  const checkout = extractCheckoutInfo(toolResults)
  if (checkout) {
    return buildCheckoutBackedReply(checkout)
  }
  return reply
}

export function findLastProductDetails(messages) {
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i]
    if (msg.role !== 'tool') continue
    const data = parseToolContent(msg.content)
    if (!data || data.error) continue
    if (data.id && data.name && (data.description != null || data.sizes || data.colors)) {
      return data
    }
    return null
  }
  return null
}

export function buildProductDetailReply(product) {
  if (!product || product.error) {
    return product?.error || 'I could not load that product. Please try again.'
  }

  const sizes =
    Array.isArray(product.sizes) && product.sizes.length
      ? product.sizes.join(', ')
      : 'One size'
  const colors =
    Array.isArray(product.colors) && product.colors.length
      ? product.colors.join(', ')
      : 'Default'
  const stock =
    product.qtyLeft != null
      ? `${product.qtyLeft} in stock`
      : product.inStock
        ? 'In stock'
        : 'Out of stock'
  const url = product.productUrl || `/products/${product.id}`

  const lines = [
    `**${product.name}** — ${formatInr(product.price)}`,
    '',
    product.description || 'No description available.',
    '',
    `- **Brand:** ${product.brand || '—'}`,
    `- **Category:** ${product.category || '—'}`,
    `- **Stock:** ${stock}`,
    `- **Available sizes:** ${sizes}`,
    `- **Available colors:** ${colors}`,
  ]

  if (product.totalReviews) {
    lines.push(`- **Reviews:** ${product.totalReviews} customer review(s)`)
  }

  lines.push(
    '',
    `[View product](${url})`,
    '',
    'If you would like to add this to your cart, tell me your preferred **size**, **color**, and **quantity**.'
  )

  return lines.join('\n')
}

function lastToolWasSearchListing(messages) {
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i]
    if (msg.role !== 'tool') continue
    const data = parseToolContent(msg.content)
    if (!data) return false
    return Array.isArray(data.products)
  }
  return false
}

export function formatAgentReply(reply, messages, userText = '') {
  const lastDetails = findLastProductDetails(messages)
  if (lastDetails) {
    return sanitizeAssistantReply(buildProductDetailReply(lastDetails))
  }

  let formatted = reply
  if (lastToolWasSearchListing(messages)) {
    const lastCatalog = findLastProductCatalog(messages)
    if (lastCatalog?.strictListing) {
      formatted = buildCatalogBackedReply(lastCatalog, {
        kitQuery: isKitBundleQuery(userText),
      })
    }
  }
  formatted = applyKitSearchReply(formatted, userText)
  return sanitizeAssistantReply(formatted)
}

export function buildChatResponse(reply, toolResults) {
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
