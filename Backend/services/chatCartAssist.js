import Product from '../model/Product.js'
import { executeTool } from './chatTools.js'
import {
  extractProductsFromHistory,
  getPendingCartProductName,
  inferPurchaseFromContext,
  isBulkAddIntent,
  isExplicitAddIntent,
  isVariantOnlyReply,
  parseQuantityIntent,
  resolveMultipleProductsFromContext,
  resolveProductIdFromContext,
  shouldAssistCart,
} from './chatGraph/productContext.js'
import {
  isBallLikeProduct,
  listMissingVariantFields,
  productUsesApparelSizes,
  resolveColorForProduct,
  resolveSizeForProduct,
} from './cartVariantMatch.js'
import { buildCartMissingPrompt } from './chatMissingFields.js'
import { formatInr } from './chatPostProcess.js'
import { embedCartQueue, parseCartQueueFromHistory } from './cartQueue.js'

function cartAddsInResults(toolResults) {
  return toolResults.filter((r) => r?.success && r?.cart && r?.toolName === 'add_to_cart')
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
  const sizeNote = !productUsesApparelSizes(product.name)
    ? '\n\n*(This item does not use clothing sizes — tell me the color and quantity.)*'
    : product.sizes?.length > 1
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
    return 'Your cart is empty. Tell me what you would like to add.'
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
  const resolvedSize = resolveSizeForProduct(size, product.sizes, product.name, userText)

  const missing = []
  if (!resolvedColor && (product.colors?.length || 0) > 1) missing.push('color')
  if (
    productUsesApparelSizes(product.name) &&
    !resolvedSize &&
    (product.sizes?.length || 0) > 1
  ) {
    missing.push('size')
  }

  if (missing.length) {
    return { ok: false, missing, product }
  }

  const finalColor = resolvedColor || product.colors?.[0]
  const finalSize =
    resolvedSize || product.sizes?.[0] || (isBallLikeProduct(product.name) ? 'Standard' : 'One Size')

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

async function processCartQueue(userId, userText, history, toolResults, queue, purchase) {
  let results = [...toolResults]
  const remaining = [...(queue.remaining || [])]

  while (remaining.length) {
    const current = remaining[0]
    const product = await Product.findById(current.productId).select('name colors sizes price')
    if (!product) {
      remaining.shift()
      continue
    }

    const isPending =
      isVariantOnlyReply(userText, history) ||
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
      const reply = embedCartQueue(
        `For **${product.name}** (qty ${current.qty}):\n\n${buildVariantPrompt(product, attempt.missing)}`,
        nextQueue
      )
      return { toolResults: results, reply }
    }

    if (attempt.error) {
      return { toolResults: results, reply: attempt.error }
    }
  }

  const reply = await buildCartConfirmationReply(userId, results)
  return { toolResults: results, reply }
}

export async function runCartAssist(userId, userText, history = [], toolResults = [], options = {}) {
  const llmAdds = cartAddsInResults(toolResults)
  if (llmAdds.length) {
    return {
      toolResults,
      reply: await buildCartConfirmationReply(userId, toolResults),
    }
  }

  if (!shouldAssistCart(userText, history)) {
    return { toolResults, reply: null }
  }

  const existingQueue = parseCartQueueFromHistory(history)
  const purchase = inferPurchaseFromContext(userText, history) || { qty: 1, size: null, color: null }

  if (existingQueue?.remaining?.length) {
    return processCartQueue(userId, userText, history, toolResults, existingQueue, purchase)
  }

  if (isBulkAddIntent(userText) && !isExplicitAddIntent(userText)) {
    return { toolResults, reply: buildPickProductsPrompt(history) }
  }

  if (isBulkAddIntent(userText) && isExplicitAddIntent(userText)) {
    const vague = /\b(add|put)\s+(them|those|these)\b/i.test(userText)
    const multi = resolveMultipleProductsFromContext(history, userText)
    if (vague && multi.length < 2) {
      return { toolResults, reply: buildPickProductsPrompt(history) }
    }
  }

  const multi = resolveMultipleProductsFromContext(history, userText)
  const qty = parseQuantityIntent(userText)

  if (multi.length > 1 && isExplicitAddIntent(userText)) {
    const queue = buildQueueFromProducts(multi, qty)
    return processCartQueue(userId, userText, history, toolResults, queue, purchase)
  }

  const productId = resolveProductIdFromContext(history, userText)
  if (!productId) {
    if (options.route === 'checkout' && purchase) {
      return {
        toolResults,
        reply: buildPickProductsPrompt(history),
      }
    }
    return { toolResults, reply: null }
  }

  const product = await Product.findById(productId).select('name colors sizes price')
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
    return {
      toolResults: newResults,
      reply: await buildCartConfirmationReply(userId, newResults),
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
      reply: embedCartQueue(buildVariantPrompt(product, attempt.missing), queue),
    }
  }

  if (attempt.error) {
    return { toolResults, reply: attempt.error }
  }

  return { toolResults, reply: null }
}
