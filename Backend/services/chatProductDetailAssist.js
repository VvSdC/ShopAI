/** Deterministic product-detail fallback for ordinal picks and follow-up questions. */
import Product from '../model/Product.js'
import { executeTool } from './chatTools.js'
import { buildProductDetailReply } from './chatPostProcess.js'
import {
  isOrdinalPickPhrase,
  lastAssistantLooksLikeProductListing,
  resolveOrdinalCatalogProduct,
  resolveProductIdFromContext,
} from './chatGraph/productContext.js'
import { isProductDetailIntent, getPurchaseIntent } from './purchaseIntentExtractor.js'

function escapeRegex(text) {
  return String(text || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export async function resolveListingNameToProductId(name) {
  const trimmed = String(name || '').trim()
  if (!trimmed) return null

  const exact = await Product.findOne({
    name: new RegExp(`^${escapeRegex(trimmed)}$`, 'i'),
  })
    .select('_id')
    .lean()
  if (exact?._id) return String(exact._id)

  const prefix = escapeRegex(trimmed.slice(0, Math.min(trimmed.length, 48)))
  const fuzzy = await Product.findOne({ name: new RegExp(prefix, 'i') })
    .select('_id')
    .lean()
  return fuzzy?._id ? String(fuzzy._id) : null
}

async function resolveProductIdForDetail(userText, history, cartQueue) {
  const ordinal = resolveOrdinalCatalogProduct(userText, history)
  if (ordinal?.id) return ordinal.id
  if (ordinal?.name) {
    const byName = await resolveListingNameToProductId(ordinal.name)
    if (byName) return byName
  }

  return resolveProductIdFromContext(history, userText, cartQueue)
}

function shouldRunProductDetailAssist(userText, history, graphRoute) {
  const text = String(userText || '').trim()
  if (!text) return false

  if (isOrdinalPickPhrase(text) && lastAssistantLooksLikeProductListing(history)) {
    return !/\b(add|put)\b/i.test(text.toLowerCase())
  }

  if (graphRoute === 'product_detail' && lastAssistantLooksLikeProductListing(history)) {
    return true
  }

  return false
}

/**
 * @returns {Promise<{ toolResults: object[], reply: string|null }>}
 */
export async function runProductDetailAssist(
  userId,
  userText,
  history = [],
  toolResults = [],
  options = {}
) {
  if (!shouldRunProductDetailAssist(userText, history, options.route)) {
    const intent = await getPurchaseIntent(userText, history, options.cartQueue ?? null)
    if (!isProductDetailIntent(intent)) {
      return { toolResults, reply: null }
    }
  }

  const productId = await resolveProductIdForDetail(
    userText,
    history,
    options.cartQueue ?? null
  )
  if (!productId) {
    if (isOrdinalPickPhrase(userText) && lastAssistantLooksLikeProductListing(history)) {
      return {
        toolResults,
        reply:
          "I couldn't match that to a product from the list. Tap **View product** on an item above, or tell me the product name.",
      }
    }
    return { toolResults, reply: null }
  }

  const result = await executeTool('get_product_details', userId, {
    product_id: productId,
  })
  if (result.error) {
    return { toolResults, reply: null }
  }

  return {
    toolResults: [...toolResults, { ...result, toolName: 'get_product_details' }],
    reply: buildProductDetailReply(result),
  }
}
