import { LLM_MAX_TOKENS_PURCHASE_INTENT } from '../constants/chatLimits.js'
import { chatCompletion } from './llmService.js'
import logger from '../utils/logger.js'
import { patchLlmUsageContext } from './llmUsageContext.js'
import {
  activeCatalogProducts,
  getPendingCartProductName,
} from './chatGraph/productContext.js'
import { resolveActiveCartQueue } from './cartQueue.js'
import {
  getCachedPurchaseIntent,
  setCachedPurchaseIntent,
} from './purchaseIntentContext.js'

const VALID_INTENTS = new Set([
  'add_to_cart',
  'variant_reply',
  'bulk_add',
  'product_detail',
  'none',
])

const OBJECT_ID_PATTERN = /^[a-f0-9]{24}$/i

function formatHistorySnippet(history, limit = 6) {
  return (history || [])
    .slice(-limit)
    .map(
      (m) =>
        `${m.role === 'user' ? 'Customer' : 'Assistant'}: ${String(m.content || '').slice(0, 400)}`
    )
    .join('\n')
}

export function parsePurchaseIntentJson(raw) {
  let text = String(raw || '').trim()
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fence) text = fence[1].trim()
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start < 0 || end <= start) return null

  try {
    const parsed = JSON.parse(text.slice(start, end + 1))
    const intent = String(parsed.intent || 'none').trim()
    if (!VALID_INTENTS.has(intent)) return null

    const product_id =
      parsed.product_id && OBJECT_ID_PATTERN.test(String(parsed.product_id))
        ? String(parsed.product_id)
        : null

    const product_ids = Array.isArray(parsed.product_ids)
      ? parsed.product_ids
          .map((id) => String(id || '').trim())
          .filter((id) => OBJECT_ID_PATTERN.test(id))
      : []

    const qtyRaw = parsed.qty
    const qty =
      qtyRaw == null || qtyRaw === ''
        ? null
        : Math.max(1, parseInt(String(qtyRaw), 10) || 1)

    return {
      intent,
      product_id,
      product_ids,
      size: parsed.size != null ? String(parsed.size).trim() || null : null,
      color: parsed.color != null ? String(parsed.color).trim() || null : null,
      qty: Number.isFinite(qty) ? qty : null,
      confidence: parsed.confidence === 'high' ? 'high' : 'low',
    }
  } catch {
    return null
  }
}

function constrainToCatalog(intent, catalog) {
  const allowed = new Set(catalog.map((p) => p.id))
  let product_id = intent.product_id
  if (product_id && !allowed.has(product_id)) product_id = null

  let product_ids = intent.product_ids.filter((id) => allowed.has(id))
  if (!product_id && product_ids.length === 1) {
    product_id = product_ids[0]
    product_ids = []
  }

  return { ...intent, product_id, product_ids }
}

export const EMPTY_PURCHASE_INTENT = {
  intent: 'none',
  product_id: null,
  product_ids: [],
  size: null,
  color: null,
  qty: null,
  confidence: 'low',
}

async function extractPurchaseIntentWithLlm(userText, history = [], cartQueue = null) {
  const catalog = activeCatalogProducts(history)
  if (!catalog.length) {
    return { ...EMPTY_PURCHASE_INTENT }
  }

  const pending = getPendingCartProductName(history)
  const queue = resolveActiveCartQueue(history, cartQueue)
  const productLines = catalog
    .map((p) => `- ${p.id}: ${p.name || '(unnamed product)'}`)
    .join('\n')

  const system = `You extract structured shopping intent from the customer message.
Use conversation context and product list. Works for any language (English, Hindi, Hinglish, informal).

Reply JSON only:
{"intent":"add_to_cart","product_id":"24-char hex or null","product_ids":[],"size":"string or null","color":"string or null","qty":number or null,"confidence":"high"|"low"}

intent values:
- add_to_cart — customer wants to buy/add a specific product
- variant_reply — answering size, color, or quantity for a pending cart add (no new product search)
- bulk_add — multiple distinct products in one request
- product_detail — asking about one product without adding to cart
- none — no product selection / cart intent in this message

Rules:
- product_id and product_ids must come ONLY from the catalog list below
- Resolve references ("the red one", "it", "वो लाल वाला", "forty-two" as shoe size) from context
- Prefer product_id for a single target; use product_ids for multiple
- When unsure, use confidence "low" and intent "none"`

  const user = `Catalog products:
${productLines}

Pending cart item: ${pending || 'none'}
Active multi-add queue: ${queue?.remaining?.length ? 'yes' : 'no'}

Recent conversation:
${formatHistorySnippet(history) || '(none)'}

Latest customer message:
${userText}`

  patchLlmUsageContext({ span: 'purchase-intent-extractor' })
  const response = await chatCompletion(
    [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    null,
    { maxTokens: LLM_MAX_TOKENS_PURCHASE_INTENT }
  )

  const parsed = parsePurchaseIntentJson(response.choices?.[0]?.message?.content)
  if (!parsed) {
    logger.warn('[purchaseIntentExtractor] Unparseable LLM response')
    return { ...EMPTY_PURCHASE_INTENT }
  }

  return constrainToCatalog(parsed, catalog)
}

/**
 * Cached per chat turn — extracts { product_id, product_ids, size, color, qty, intent }.
 */
export async function getPurchaseIntent(userText, history = [], cartQueue = null) {
  const cached = getCachedPurchaseIntent(userText, history)
  if (cached) return cached

  try {
    const intent = await extractPurchaseIntentWithLlm(userText, history, cartQueue)
    setCachedPurchaseIntent(userText, history, intent)
    return intent
  } catch (err) {
    logger.warn('[purchaseIntentExtractor] extraction failed:', err.message)
    const fallback = { ...EMPTY_PURCHASE_INTENT }
    setCachedPurchaseIntent(userText, history, fallback)
    return fallback
  }
}

export function intentToPurchaseShape(intent) {
  if (!intent || intent.intent === 'none') {
    return { qty: 1, size: null, color: null }
  }
  return {
    qty: intent.qty || 1,
    size: intent.size,
    color: intent.color,
  }
}

export function isCartAssistIntent(intent) {
  if (!intent) return false
  return ['add_to_cart', 'variant_reply', 'bulk_add'].includes(intent.intent)
}

export function isVariantReplyIntent(intent) {
  return intent?.intent === 'variant_reply'
}

export function resolveProductIdsFromIntent(intent, history) {
  if (!intent) return []
  if (intent.product_ids?.length) {
    return intent.product_ids.map((id) => {
      const hit = activeCatalogProducts(history).find((p) => p.id === id)
      return { id, name: hit?.name || '' }
    })
  }
  if (intent.product_id) {
    const hit = activeCatalogProducts(history).find((p) => p.id === intent.product_id)
    return [{ id: intent.product_id, name: hit?.name || '' }]
  }
  return []
}
