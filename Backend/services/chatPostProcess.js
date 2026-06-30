import logger from '../utils/logger.js'
import { previewCheckout, checkoutFromCart } from './checkoutFromCart.js'
import {
  isCheckoutProceedIntent,
  conversationMentionsCheckoutPending,
} from './chatIntentHelpers.js'
import { isKitBundleQuery } from './chatGraph/productContext.js'
import { stripCartQueueMarker } from './cartQueue.js'
import { productRequiresSizeSelection } from '../utils/normalizeProductSizes.js'
import {
  extractCatalogProductsFromContent,
  isCatalogOrdinalSelection,
  isOrdinalPickPhrase,
  lastAssistantLooksLikeProductListing,
  resolveOrdinalCatalogProduct,
} from './chatGraph/productContext.js'

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

export function findSearchCatalog(messages = [], toolResults = []) {
  for (let i = toolResults.length - 1; i >= 0; i--) {
    const row = toolResults[i]
    if (row?.toolName !== 'search_products' && !Array.isArray(row?.products)) continue
    if (row.error) {
      return {
        count: 0,
        products: [],
        message: row.error,
        strictListing: true,
      }
    }
    if (Array.isArray(row.products)) {
      return {
        count: row.count ?? row.products.length,
        products: row.products,
        message: row.message,
        strictListing: true,
      }
    }
  }
  return findLastProductCatalog(messages)
}

/** Invented listings often use short numeric IDs instead of real 24-char Mongo IDs. */
export function looksLikeHallucinatedProductLinks(reply) {
  if (!reply || typeof reply !== 'string') return false
  const links = [...reply.matchAll(/\[View product\]\(\/products\/([^)]+)\)/gi)]
  if (!links.length) return false
  return links.some((match) => !/^[a-f0-9]{24}$/i.test(match[1]))
}

export function replyHasCatalogProductLinks(reply) {
  return /\[View product\]\(\/products\/[a-f0-9]{24}\)/i.test(String(reply || ''))
}

const OBJECT_ID_RE = /^[a-f0-9]{24}$/i

export function extractCatalogFromToolResults(toolResults = []) {
  const searchResult = findSearchCatalog([], toolResults)
  if (searchResult?.products?.length) {
    return searchResult.products
      .map((p) => ({
        id: String(p.id || p._id || ''),
        name: String(p.name || '').trim(),
      }))
      .filter((p) => OBJECT_ID_RE.test(p.id))
  }

  // No search result, but a product detail view counts as the active catalog
  // for follow-up turns (so "2 bats 28 size" after a detail card can resolve
  // back to that product without re-searching).
  const detail = findLastProductDetailsInToolResults(toolResults)
  if (detail?.id && detail?.name && OBJECT_ID_RE.test(String(detail.id))) {
    return [{ id: String(detail.id), name: String(detail.name).trim() }]
  }

  return []
}

export function extractCatalogFromReply(reply) {
  return extractCatalogProductsFromContent(reply)
}

export function resolveCatalogProductsForSession(toolResults = [], reply = '') {
  const fromTools = extractCatalogFromToolResults(toolResults)
  if (fromTools.length) return fromTools
  return extractCatalogFromReply(reply)
}

function looksLikeProductDetailReply(reply) {
  const text = String(reply || '')
  return (
    /\[View product\]\(\/products\/[a-f0-9]{24}\)/i.test(text) &&
    /If you would like to add this to your cart/i.test(text)
  )
}

export function ensureSearchCatalogReply(reply, toolResults = [], userText = '') {
  if (looksLikeProductDetailReply(reply) || isOrdinalPickPhrase(userText)) {
    return reply
  }

  const searchResult = findSearchCatalog([], toolResults)
  if (!searchResult?.products?.length || replyHasCatalogProductLinks(reply)) {
    return reply
  }

  return buildCatalogBackedReply(searchResult, { kitQuery: isKitBundleQuery(userText) })
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
  return stripCartQueueMarker(reply)
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

export function buildCatalogBackedReply(searchResult, { kitQuery = false, cardsOnly = false } = {}) {
  const count = searchResult.count ?? 0
  if (count === 0) {
    return (
      searchResult.message ||
      "I couldn't find any products matching that in our catalog. Would you like me to try a different search?"
    )
  }

  const intro =
    count === 1
      ? 'I found **1** product in our catalog that matches:'
      : `I found **${count}** products in our catalog that match:`

  const kitNote = kitQuery
    ? "We don't have a single pre-made **kit** in our catalog, but you can combine these items:\n\n"
    : ''

  const outro = kitQuery
    ? 'Tell me which items to add (e.g. *Add the bat and leather ball, 2 each*) or tap a product card below.'
    : 'Tap a product card below for details, or tell me which one to add (size, color, and quantity when needed).'

  if (cardsOnly) {
    return `${kitNote}${intro}\n\n${outro}`
  }

  const list = formatProductListBlock(searchResult)
  const legacyOutro = kitQuery
    ? 'Tell me which items to add (e.g. *Add the bat and leather ball, 2 each*) or tap **View product** for details.'
    : 'Tap **View product** to see full details. Tell me which items to add, with size, color, and quantity when needed.'

  return `${kitNote}${intro}\n\n${list}\n\n${legacyOutro}`
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
    logger.error('Auto checkout on confirm failed:', err.message)
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
    if (data.cart || Array.isArray(data.products) || Array.isArray(data.orders)) {
      continue
    }
    if (data.id && data.name && (data.description != null || data.sizes || data.colors)) {
      return data
    }
  }
  return null
}

export function findLastProductDetailsInToolResults(toolResults = []) {
  for (let i = toolResults.length - 1; i >= 0; i--) {
    const row = toolResults[i]
    if (row?.error) continue
    if (row?.toolName === 'get_product_details' || (row?.id && row?.name && row?.description != null)) {
      if (row.id && row.name) return row
    }
  }
  return null
}

export function buildProductDetailReply(product, options = {}) {
  if (!product || product.error) {
    return product?.error || 'I could not load that product. Please try again.'
  }

  const compact = Boolean(options.compact)

  const noSizeProduct = product.sizeMeasurementType === 'none'
  const sizeLabel = product.sizeLabel || 'Size'
  const sizes =
    noSizeProduct
      ? 'No size selection required'
      : Array.isArray(product.sizes) && product.sizes.length
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

  if (compact) {
    return [
      `Here’s **${product.name}** — ${formatInr(product.price)}.`,
      '',
      'Use the card below to view details, or tell me the **size** and **quantity** to add it to your cart.',
    ].join('\n')
  }

  const lines = [
    `**${product.name}** — ${formatInr(product.price)}`,
    '',
    product.description || 'No description available.',
    '',
    `- **Brand:** ${product.brand || '—'}`,
    `- **Category:** ${product.category || '—'}`,
    `- **Stock:** ${stock}`,
    `- **Available ${noSizeProduct ? 'sizes' : sizeLabel.toLowerCase()}:** ${sizes}`,
    `- **Available colors:** ${colors}`,
  ]

  if (product.totalReviews) {
    lines.push(`- **Reviews:** ${product.totalReviews} customer review(s)`)
  }

  lines.push(
    '',
    `[View product](${url})`,
    '',
    productRequiresSizeSelection(product) && (product.colors?.length || 0) > 1
      ? 'If you would like to add this to your cart, tell me your preferred **size**, **color**, and **quantity**.'
      : productRequiresSizeSelection(product)
        ? 'If you would like to add this to your cart, tell me your preferred **size** and **quantity**.'
        : (product.colors?.length || 0) > 1
          ? 'If you would like to add this to your cart, tell me your preferred **color** and **quantity**.'
          : 'If you would like to add this to your cart, tell me the **quantity** (size and color are optional for this item).'
  )

  return lines.join('\n')
}

export function formatAgentReply(
  reply,
  messages,
  userText = '',
  toolResults = [],
  history = [],
  { plan = null, replyKind = null, replyLocked = false } = {}
) {
  if (replyLocked && reply) {
    return sanitizeAssistantReply(reply)
  }

  const historyForOrdinal = history.length ? history : messages
  const hasCartAdd = toolResults.some(
    (r) => r?.toolName === 'add_to_cart' && r?.success && (r?.cart?.items?.length || 0) > 0
  )
  const ordinalLike =
    plan?.product_ref?.kind === 'ordinal' ||
    isCatalogOrdinalSelection(userText, historyForOrdinal) ||
    (isOrdinalPickPhrase(userText) && lastAssistantLooksLikeProductListing(historyForOrdinal))

  if (!hasCartAdd && /cart is empty/i.test(String(reply || '')) && ordinalLike) {
    reply = null
  }

  if (!hasCartAdd) {
    const lastDetails =
      findLastProductDetails(messages) || findLastProductDetailsInToolResults(toolResults)
    if (lastDetails) {
      return sanitizeAssistantReply(buildProductDetailReply(lastDetails, { plan }))
    }

    if (looksLikeProductDetailReply(reply)) {
      return sanitizeAssistantReply(reply)
    }

    if (ordinalLike) {
      const pickedName =
        plan?.product_ref?.name ||
        resolveOrdinalCatalogProduct(userText, historyForOrdinal)?.name
      if (pickedName) {
        return sanitizeAssistantReply(
          `You selected **${pickedName}** from the list. Tell me to **add** it to your cart with size, color, and quantity, or tap **View product** on the listing above for full details.`
        )
      }
    }
  }

  const lastCatalog = findSearchCatalog(messages, toolResults)
  let formatted = reply

  if (
    lastCatalog?.strictListing &&
    !looksLikeProductDetailReply(reply) &&
    !ordinalLike &&
    replyKind !== 'product_detail'
  ) {
    formatted = buildCatalogBackedReply(lastCatalog, {
      kitQuery: isKitBundleQuery(userText),
    })
  } else if (looksLikeHallucinatedProductLinks(reply)) {
    formatted =
      "I couldn't verify those products in our catalog. Tell me what you're looking for and I'll search our store."
  }

  formatted = applyKitSearchReply(formatted, userText)
  return sanitizeAssistantReply(formatted)
}

/** Shorten prose when structured UI blocks carry listings, detail, cart, or addresses. */
export function applyBlockAwareReply(reply, blocks, toolResults = [], userText = '') {
  if (!blocks?.length) return reply

  if (blocks.some((b) => b.type === 'product_listing')) {
    const catalog = findSearchCatalog([], toolResults)
    if (catalog?.products?.length) {
      return buildCatalogBackedReply(catalog, {
        kitQuery: isKitBundleQuery(userText),
        cardsOnly: true,
      })
    }
  }

  if (blocks.some((b) => b.type === 'product_detail')) {
    const detail = findLastProductDetailsInToolResults(toolResults)
    if (detail) {
      return buildProductDetailReply(detail, { compact: true })
    }
  }

  if (blocks.some((b) => b.type === 'cart_summary')) {
    const intro =
      /added/i.test(reply) ? "I've updated your cart:" : 'Your cart:'
    return `${intro}\n\nSee the summary below. Would you like to **proceed to checkout** or apply a coupon?`
  }

  if (blocks.some((b) => b.type === 'address_picker')) {
    return 'Choose a **shipping address** below, tap **New address**, or reply with the number or city name.'
  }

  return reply
}

export function buildChatResponse(reply, toolResults, extra = {}) {
  const payload = { success: true, reply, ...extra }
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
