import { resolveActiveCartQueue } from '../cartQueue.js'
import { getPurchaseIntent } from '../purchaseIntentExtractor.js'

function normalizeProductName(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/[\u2010-\u2015‑]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
}

function extractProductsFromMessage(content) {
  const items = []
  const seen = new Set()
  const text = String(content || '')

  const linkedPattern =
    /\*\*([^*]+)\*\*[^[]*\[View product\]\(\/products\/([a-f0-9]{24})\)/gi
  let match
  while ((match = linkedPattern.exec(text)) !== null) {
    const id = match[2]
    if (!seen.has(id)) {
      seen.add(id)
      items.push({ id, name: match[1].trim() })
    }
  }

  const urlPattern = /\/products\/([a-f0-9]{24})/gi
  while ((match = urlPattern.exec(text)) !== null) {
    const id = match[1]
    if (!seen.has(id)) {
      seen.add(id)
      items.push({ id, name: '' })
    }
  }

  return items
}

/** Products from the most recent assistant catalog listing (avoids stale items). */
export function extractProductsFromLastListing(history) {
  for (let i = (history || []).length - 1; i >= 0; i--) {
    const msg = history[i]
    if (msg.role !== 'assistant') continue
    const items = extractProductsFromMessage(msg.content)
    if (items.length) return items
  }
  return []
}

export function extractProductsFromHistory(history) {
  const items = []
  const seen = new Set()

  for (const message of history || []) {
    if (message.role !== 'assistant') continue
    for (const item of extractProductsFromMessage(message.content)) {
      if (!seen.has(item.id)) {
        seen.add(item.id)
        items.push(item)
      }
    }
  }

  return items
}

export function activeCatalogProducts(history) {
  const last = extractProductsFromLastListing(history)
  return last.length ? last : extractProductsFromHistory(history)
}

export function isKitBundleQuery(userText) {
  return /\b(kit|bundle|set|combo|package)\b/i.test(String(userText || ''))
}

export function isBulkAddIntent(userText) {
  const t = String(userText || '').toLowerCase()
  return (
    /\b(add|put)\s+(them|those|these|all)\b/.test(t) ||
    /\badd\s+all\b/.test(t) ||
    /\byou can add\b/.test(t)
  )
}

export function isExplicitAddIntent(userText) {
  const t = String(userText || '').trim().toLowerCase()
  if (/^you can add\b/.test(t)) return false
  return /\b(add|buy|purchase|want|get|need|order)\b/.test(t)
}

export function parseQuantityIntent(userText) {
  const t = String(userText || '').toLowerCase()
  const eachMatch = t.match(/\b(\d+)\s*each\b/)
  if (eachMatch) return Math.max(1, parseInt(eachMatch[1], 10))

  const qtyMatch =
    t.match(/\b(\d+)\s*(?:x|×|item|items|piece|pieces|of)\b/) ||
    t.match(/\b(?:want|add|buy|get)\s+(\d+)\b/) ||
    t.match(/\b(\d+)\b/)
  return qtyMatch ? Math.max(1, parseInt(qtyMatch[1], 10)) : 1
}

export function getPendingCartProductName(history) {
  for (let i = history.length - 1; i >= 0; i--) {
    const msg = history[i]
    if (msg.role !== 'assistant') continue
    const content = String(msg.content || '')
    const match =
      content.match(/add \*\*([^*]+)\*\* to your cart/i) ||
      content.match(/For \*\*([^*]+)\*\*/i)
    if (match) return match[1].trim()
  }
  return null
}

/** Lightweight routing signal — detailed resolution uses getPurchaseIntent(). */
export function isAddToCartVariantIntent(text, history = []) {
  if (!extractProductsFromHistory(history).length) return false
  if (getPendingCartProductName(history)) return true
  if (isBulkAddIntent(text)) return true
  if (isExplicitAddIntent(text)) return true
  return false
}

export function resolveProductIdFromPending(history, pendingName) {
  if (!pendingName) return null
  const norm = normalizeProductName(pendingName)
  const items = activeCatalogProducts(history)
  const hit = items.find((i) => i.name && normalizeProductName(i.name) === norm)
  return hit?.id || null
}

export async function resolveProductIdFromContext(history, userText, cartQueue = null) {
  const items = activeCatalogProducts(history)
  if (!items.length) return null

  const intent = await getPurchaseIntent(userText, history, cartQueue)

  if (intent.product_id) return intent.product_id
  if (intent.product_ids?.length === 1) return intent.product_ids[0]

  const pending = getPendingCartProductName(history)
  const activeQueue = resolveActiveCartQueue(history, cartQueue)
  if (pending && (intent.intent === 'variant_reply' || activeQueue)) {
    const pendingId = resolveProductIdFromPending(history, pending)
    if (pendingId) return pendingId
  }

  if (intent.product_ids?.length === 1) return intent.product_ids[0]

  if (items.length === 1) return items[0].id

  return null
}
