import Product from '../model/Product.js'
import { executeTool } from './chatTools.js'
import { resolveOptionMatch } from './cartService.js'
import {
  inferPurchaseFromContext,
  resolveProductIdFromContext,
} from './chatGraph/productContext.js'
import { buildCartMissingPrompt } from './chatMissingFields.js'
import { formatInr } from './chatPostProcess.js'

function cartAlreadyAdded(toolResults) {
  return toolResults.some((r) => r?.success && r?.cart && r?.toolName === 'add_to_cart')
}

export async function runCartAssist(userId, userText, history = [], toolResults = [], options = {}) {
  if (cartAlreadyAdded(toolResults)) {
    return { toolResults, reply: null }
  }

  const purchase = inferPurchaseFromContext(userText, history)

  if (!purchase) {
    return { toolResults, reply: null }
  }

  const productId = resolveProductIdFromContext(history, userText)
  if (!productId) {
    if (options.route === 'checkout' && purchase) {
      return {
        toolResults,
        reply: buildCartMissingPrompt('your item', ['product']),
      }
    }
    return { toolResults, reply: null }
  }

  const product = await Product.findById(productId).select('name colors sizes price')
  if (!product) {
    return { toolResults, reply: null }
  }

  if (!purchase) {
    return { toolResults, reply: null }
  }

  const color =
    resolveOptionMatch(purchase.color, product.colors) ||
    (product.colors.length === 1 ? product.colors[0] : null)
  const size =
    resolveOptionMatch(purchase.size, product.sizes) ||
    (product.sizes.length === 1 ? product.sizes[0] : null)

  const missing = []
  if (!color && product.colors.length > 1) missing.push('color')
  if (!size && product.sizes.length > 1) missing.push('size')

  if (missing.length) {
    const extra =
      product.colors.length > 1 ? `\n\nAvailable colors: ${product.colors.join(', ')}.` : ''
    const extraSizes =
      product.sizes.length > 1 ? `\nAvailable sizes: ${product.sizes.join(', ')}.` : ''
    return {
      toolResults,
      reply: `${buildCartMissingPrompt(product.name, missing)}${extra}${extraSizes}`,
    }
  }

  if (!color || !size) {
    return {
      toolResults,
      reply: buildCartMissingPrompt(product.name, [
        ...(!color ? ['color'] : []),
        ...(!size ? ['size'] : []),
      ]),
    }
  }

  const result = await executeTool('add_to_cart', userId, {
    product_id: productId,
    color,
    size,
    qty: purchase.qty || 1,
  })

  if (result.error) {
    return { toolResults, reply: result.error }
  }

  const qty = purchase.qty || 1
  const lineTotal = product.price * qty
  return {
    toolResults: [...toolResults, { ...result, toolName: 'add_to_cart' }],
    reply: `Added **${qty} × ${product.name}** (${size}, ${color}) to your cart — ${formatInr(lineTotal)} for this line.\n\nSay **proceed to checkout** when you're ready to pay.`,
  }
}
