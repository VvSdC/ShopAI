/** Deterministic cart fallback — orchestrated by chatDeterministicAssist.js after LangGraph. */
import Product from '../model/Product.js'
import { executeTool } from './chatTools.js'
import {
  extractProductsFromHistory,
  getPendingCartProductName,
  isBulkAddIntent,
  isExplicitAddIntent,
  lastAssistantMessageKind,
  parseQuantityIntent,
  resolveProductIdFromContext,
} from './chatGraph/productContext.js'
import {
  getPurchaseIntent,
  intentToPurchaseShape,
  isCartAssistIntent,
  isVariantReplyIntent,
  resolveProductIdsFromIntent,
} from './purchaseIntentExtractor.js'
import {
  isBallLikeProduct,
  resolveColorForProduct,
  resolveSizeForProduct,
} from './cartVariantMatch.js'
import { productRequiresSizeSelection } from '../utils/normalizeProductSizes.js'
import { buildCartMissingPrompt } from './chatMissingFields.js'
import { formatInr } from './chatPostProcess.js'
import { resolveActiveCartQueue } from './cartQueue.js'

function cartAddsInResults(toolResults) {
  return toolResults.filter(
    (r) =>
      r?.success &&
      r?.toolName === 'add_to_cart' &&
      Array.isArray(r?.cart?.items) &&
      r.cart.items.length > 0
  )
}

function buildPickProductsPrompt(history) {
  const items = extractProductsFromHistory(history).filter((i) => i.name)
  if (!items.length) {
    return 'Tell me which product you want to add — include the name and quantity (e.g. *Add the Kookaburra bat and leather ball, 2 each*).'
  }
  const lines = items.map((i) => `- **${i.name}**`).join('\n')
  return `I can add items from your search results. Which ones should go in your cart?\n\n${lines}\n\nExample: **Add the Kookaburra bat and leather ball, 2 each** — or name one product with size, color, and quantity.`
}

function buildVariantPrompt(product, missing) {
  const extra =
    product.colors?.length > 1
      ? `\n\nAvailable colors: ${product.colors.join(', ')}.`
      : ''
  const sizeNote =
    product.sizeMeasurementType === 'none'
      ? '\n\n*(This item has no size — tell me the color and quantity.)*'
      : productRequiresSizeSelection(product)
        ? `\nAvailable sizes: ${product.sizes.join(', ')}.`
        : ''
  return `${buildCartMissingPrompt(product.name, missing)}${extra}${sizeNote}`
}

function cartFromToolResults(toolResults) {
  for (let i = toolResults.length - 1; i >= 0; i--) {
    const cart = toolResults[i]?.cart
    if (cart?.items?.length) return cart
  }
  return null
}

async function buildCartConfirmationReply(userId, toolResults) {
  let cart = null
  const cartResult = await executeTool('get_cart', userId, {})
  if (cartResult?.cart?.items?.length) {
    cart = cartResult.cart
  } else {
    cart = cartFromToolResults(toolResults)
  }

  if (!cart?.items?.length) {
    return null
  }

  const lines = cart.items.map(
    (item) =>
      `• **${item.qty} × ${item.name}** (${item.size}, ${item.color}) — ${formatInr(item.totalPrice)}`
  )

  const addedCount = cartAddsInResults(toolResults).length
  const intro =
    addedCount > 1
      ? "I've added the items to your cart:"
      : addedCount === 1
        ? "I've added this to your cart:"
        : 'Your cart:'

  return `${intro}\n\n${lines.join('\n')}\n\n**Cart total:** ${formatInr(cart.total)} (${cart.itemCount} unit${cart.itemCount === 1 ? '' : 's'})\n\nWould you like to apply a coupon, update quantities, or **proceed to checkout**?`
}

async function tryAddProduct(userId, product, { qty, size, color, userText }) {
  const resolvedColor = resolveColorForProduct(color, product.colors, userText)
  const resolvedSize = resolveSizeForProduct(size, product, product.name, userText)

  const missing = []
  if (!resolvedColor && (product.colors?.length || 0) > 1) missing.push('color')
  if (productRequiresSizeSelection(product) && !resolvedSize) {
    missing.push('size')
  }

  if (missing.length) {
    return { ok: false, missing, product }
  }

  const finalColor = resolvedColor || product.colors?.[0]
  const finalSize =
    resolvedSize ||
    product.sizes?.[0] ||
    (product.sizeMeasurementType === 'none' ? 'One Size' : isBallLikeProduct(product.name) ? 'Standard' : 'One Size')

  if (!finalColor) {
    return { ok: false, missing: ['color'], product }
  }

  const result = await executeTool('add_to_cart', userId, {
    product_id: String(product._id),
    color: finalColor,
    size: finalSize,
    qty: qty || 1,
  })

  if (result.error) {
    return { ok: false, error: result.error, product }
  }

  return { ok: true, result, product, color: finalColor, size: finalSize, qty: qty || 1 }
}

function buildQueueFromProducts(products, qtyDefault) {
  return {
    remaining: products.map((p) => ({
      productId: p.id,
      name: p.name,
      qty: qtyDefault,
    })),
  }
}

async function processCartQueue(userId, userText, history, toolResults, queue, purchase, cartQueue, intent) {
  let results = [...toolResults]
  const remaining = [...(queue.remaining || [])]

  while (remaining.length) {
    const current = remaining[0]
    const product = await Product.findById(current.productId).select(
      'name colors sizes price sizeMeasurementType'
    )
    if (!product) {
      remaining.shift()
      continue
    }

    const isPending =
      isVariantReplyIntent(intent) ||
      getPendingCartProductName(history) === product.name

    const variantSource = isPending ? purchase : { qty: current.qty, size: null, color: null }

    const attempt = await tryAddProduct(userId, product, {
      qty: variantSource.qty || current.qty || 1,
      size: variantSource.size,
      color: variantSource.color,
      userText: isPending ? userText : '',
    })

    if (attempt.ok) {
      results = [...results, { ...attempt.result, toolName: 'add_to_cart' }]
      remaining.shift()
      continue
    }

    if (attempt.missing?.length) {
      const nextQueue = { remaining }
      return {
        toolResults: results,
        reply: `For **${product.name}** (qty ${current.qty}):\n\n${buildVariantPrompt(product, attempt.missing)}`,
        cartQueue: nextQueue,
      }
    }

    if (attempt.error) {
      return { toolResults: results, reply: attempt.error, cartQueue: { remaining } }
    }
  }

  const reply = await buildCartConfirmationReply(userId, results)
  return { toolResults: results, reply, cartQueue: null }
}

export async function runCartAssist(userId, userText, history = [], toolResults = [], options = {}) {
  const llmAdds = cartAddsInResults(toolResults)
  if (llmAdds.length) {
    const confirmation = await buildCartConfirmationReply(userId, toolResults)
    if (confirmation) {
      return {
        toolResults,
        reply: confirmation,
        cartQueue: null,
      }
    }
  }

  const sessionQueue = options.cartQueue ?? null
  const intent = await getPurchaseIntent(userText, history, sessionQueue)

  // After a product_detail card, treat ANY message that contains variant info
  // (a digit, a size keyword, or a color keyword) as a cart variant reply —
  // even if the purchase-intent LLM was uncertain. Otherwise the user gets
  // the product detail again instead of an add-to-cart confirmation.
  const variantAfterDetail =
    lastAssistantMessageKind(history) === 'product_detail' &&
    /(\d+|\b(?:small|medium|large|xl|xxl|xs|one size|red|blue|green|black|white|yellow|orange|pink|grey|gray|brown|navy|maroon)\b)/i.test(
      String(userText || '')
    )

  if (
    !variantAfterDetail &&
    !isCartAssistIntent(intent) &&
    !isExplicitAddIntent(userText, history) &&
    !isBulkAddIntent(userText)
  ) {
    if (!getPendingCartProductName(history) && !resolveActiveCartQueue(history, sessionQueue)) {
      return { toolResults, reply: null }
    }
  }

  const existingQueue = resolveActiveCartQueue(history, sessionQueue)
  const purchase = intentToPurchaseShape(intent)

  if (existingQueue?.remaining?.length) {
    return processCartQueue(
      userId,
      userText,
      history,
      toolResults,
      existingQueue,
      purchase,
      sessionQueue ?? existingQueue,
      intent
    )
  }

  if (isBulkAddIntent(userText) && !isExplicitAddIntent(userText, history)) {
    return { toolResults, reply: buildPickProductsPrompt(history) }
  }

  if (isBulkAddIntent(userText) && isExplicitAddIntent(userText, history)) {
    const vague = /\b(add|put)\s+(them|those|these)\b/i.test(userText)
    const multi = resolveProductIdsFromIntent(intent, history)
    if (vague && multi.length < 2) {
      return { toolResults, reply: buildPickProductsPrompt(history) }
    }
  }

  const multi = resolveProductIdsFromIntent(intent, history)
  const qty = intent.qty || parseQuantityIntent(userText)

  if (multi.length > 1 && (intent.intent === 'bulk_add' || isExplicitAddIntent(userText, history))) {
    const queue = buildQueueFromProducts(multi, qty)
    return processCartQueue(userId, userText, history, toolResults, queue, purchase, queue, intent)
  }

  const resolvedId =
    intent.product_id ||
    (multi.length === 1 ? multi[0].id : null) ||
    (await resolveProductIdFromContext(history, userText, sessionQueue))

  if (!resolvedId) {
    if (options.route === 'checkout' && isCartAssistIntent(intent)) {
      return {
        toolResults,
        reply: buildPickProductsPrompt(history),
      }
    }
    return { toolResults, reply: null }
  }

  const product = await Product.findById(resolvedId).select(
    'name colors sizes price sizeMeasurementType'
  )
  if (!product) {
    return { toolResults, reply: null }
  }

  const attempt = await tryAddProduct(userId, product, {
    qty: purchase.qty || qty,
    size: purchase.size,
    color: purchase.color,
    userText,
  })

  if (attempt.ok) {
    const newResults = [...toolResults, { ...attempt.result, toolName: 'add_to_cart' }]
    const confirmation = await buildCartConfirmationReply(userId, newResults)
    return {
      toolResults: newResults,
      reply: confirmation,
      cartQueue: null,
    }
  }

  if (attempt.missing?.length) {
    const queue = {
      remaining: [
        {
          productId: String(product._id),
          name: product.name,
          qty: purchase.qty || qty || 1,
        },
      ],
    }
    return {
      toolResults,
      reply: buildVariantPrompt(product, attempt.missing),
      cartQueue: queue,
    }
  }

  if (attempt.error) {
    return { toolResults, reply: attempt.error }
  }

  return { toolResults, reply: null }
}
