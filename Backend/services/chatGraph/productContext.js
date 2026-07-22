import { resolveActiveCartQueue } from '../cartQueue.js'
import { getPurchaseIntent } from '../purchaseIntentExtractor.js'

const OBJECT_ID_PATTERN = /^[a-f0-9]{24}$/i

const ORDINAL_PICK_PATTERN =
  /\b(?:the\s+)?(?:first|second|third|fourth|fifth|sixth|seventh|eighth)(?:\s+(?:one|item|product|option))?\b|\b[1-8](?:st|nd|rd|th)\b|(?:#|no\.?\s*)[1-8]\b/i

export function isOrdinalPickPhrase(userText) {
  return ORDINAL_PICK_PATTERN.test(String(userText || '').trim().toLowerCase())
}

export function lastAssistantMessageKind(history = []) {
  for (let i = history.length - 1; i >= 0; i--) {
    const msg = history[i]
    if (msg.role !== 'assistant') continue
    return msg.messageKind || null
  }
  return null
}

export function lastAssistantLooksLikeProductListing(history = []) {
  for (let i = history.length - 1; i >= 0; i--) {
    const msg = history[i]
    if (msg.role !== 'assistant') continue
    if (msg.messageKind === 'product_listing') return true
    if (msg.messageKind && msg.messageKind !== 'product_listing') return false
    const content = String(msg.content || '')
    if (/saved shipping address(?:es)?|reply \*\*1\*\* or \*\*2\*\*|proceed to checkout/i.test(content)) {
      return false
    }
    if (msg.catalogProducts?.length) return true
    if (/found \d+ products|in our catalog/i.test(content)) return true
    if (/\bview product\b/i.test(content) && /₹/.test(content)) return true
    if (parseListingNamesFromContent(content).length >= 2 && /₹/.test(content)) return true
    return false
  }
  return false
}

export function parseListingNamesFromContent(content) {
  const names = []
  const seen = new Set()

  for (const line of String(content || '').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || /^tell me which/i.test(trimmed)) continue

    const boldLinked = trimmed.match(/\*\*([^*]+)\*\*/)
    if (boldLinked) {
      const name = boldLinked[1].trim()
      if (name && !seen.has(name.toLowerCase())) {
        seen.add(name.toLowerCase())
        names.push(name)
      }
      continue
    }

    const plain = trimmed.match(/^(?:\d+\.\s*)?(.+?)\s*—\s*₹/)
    if (plain) {
      const name = plain[1].replace(/\*\*/g, '').trim()
      if (name && !seen.has(name.toLowerCase())) {
        seen.add(name.toLowerCase())
        names.push(name)
      }
    }
  }

  return names
}

function normalizeProductName(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/[\u2010-\u2015‑]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
}

function extractProductsFromMessage(content, catalogProducts) {
  if (Array.isArray(catalogProducts) && catalogProducts.length) {
    return catalogProducts
      .map((p) => ({
        id: String(p.id || ''),
        name: String(p.name || '').trim(),
      }))
      .filter((p) => /^[a-f0-9]{24}$/i.test(p.id))
  }

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

  if (!items.length) {
    for (const name of parseListingNamesFromContent(text)) {
      const key = name.toLowerCase()
      if (!seen.has(key)) {
        seen.add(key)
        items.push({ id: '', name })
      }
    }
  }

  return items
}

export function extractCatalogProductsFromContent(content) {
  return extractProductsFromMessage(content).filter((item) => OBJECT_ID_PATTERN.test(item.id))
}

/** Products from the most recent assistant catalog listing (avoids stale items). */
export function extractProductsFromLastListing(history) {
  for (let i = (history || []).length - 1; i >= 0; i--) {
    const msg = history[i]
    if (msg.role !== 'assistant') continue
    const items = extractProductsFromMessage(msg.content, msg.catalogProducts)
    if (items.length) return items
  }
  return []
}

export function extractProductsFromHistory(history) {
  const items = []
  const seen = new Set()

  for (const message of history || []) {
    if (message.role !== 'assistant') continue
    for (const item of extractProductsFromMessage(message.content, message.catalogProducts)) {
      const key = item.id || `name:${item.name}`
      if (!seen.has(key)) {
        seen.add(key)
        items.push(item)
      }
    }
  }

  return items
}

/** Resolve "the first one", "#2", "second item", etc. against the latest catalog listing. */
export function resolveOrdinalCatalogProduct(userText, history = []) {
  const listing = extractProductsFromLastListing(history)
  if (!listing.length) return null

  const t = String(userText || '').toLowerCase().trim()
  const ordinalMatchers = [
    { re: /\b(?:the\s+)?first(?:\s+(?:one|item|product|option))?\b|\b1st\b|(?:#|no\.?\s*)1\b/, index: 0 },
    { re: /\b(?:the\s+)?second(?:\s+(?:one|item|product|option))?\b|\b2nd\b|(?:#|no\.?\s*)2\b/, index: 1 },
    { re: /\b(?:the\s+)?third(?:\s+(?:one|item|product|option))?\b|\b3rd\b|(?:#|no\.?\s*)3\b/, index: 2 },
    { re: /\b(?:the\s+)?fourth(?:\s+(?:one|item|product|option))?\b|\b4th\b|(?:#|no\.?\s*)4\b/, index: 3 },
    { re: /\b(?:the\s+)?fifth(?:\s+(?:one|item|product|option))?\b|\b5th\b|(?:#|no\.?\s*)5\b/, index: 4 },
    { re: /\b(?:the\s+)?sixth(?:\s+(?:one|item|product|option))?\b|\b6th\b|(?:#|no\.?\s*)6\b/, index: 5 },
    { re: /\b(?:the\s+)?seventh(?:\s+(?:one|item|product|option))?\b|\b7th\b|(?:#|no\.?\s*)7\b/, index: 6 },
    { re: /\b(?:the\s+)?eighth(?:\s+(?:one|item|product|option))?\b|\b8th\b|(?:#|no\.?\s*)8\b/, index: 7 },
  ]

  for (const { re, index } of ordinalMatchers) {
    if (re.test(t) && listing[index]) {
      return listing[index]
    }
  }

  return null
}

export function isCatalogOrdinalSelection(userText, history = []) {
  if (!isOrdinalPickPhrase(userText)) return false
  if (!lastAssistantLooksLikeProductListing(history)) return false
  return Boolean(resolveOrdinalCatalogProduct(userText, history))
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

export function isExplicitAddIntent(userText, history = []) {
  const t = String(userText || '').trim().toLowerCase()
  if (/^you can add\b/.test(t)) return false
  if (isOrdinalPickPhrase(userText) && !/\b(add|put)\b/.test(t)) {
    return false
  }
  if (isCatalogOrdinalSelection(userText, history) && !/\b(add|put)\b/.test(t)) {
    return false
  }
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
  if (isExplicitAddIntent(text, history)) return true
  return false
}

export function resolveProductIdFromPending(history, pendingName) {
  if (!pendingName) return null
  const norm = normalizeProductName(pendingName)
  const items = activeCatalogProducts(history)
  const hit = items.find((i) => i.name && normalizeProductName(i.name) === norm)
  return hit?.id || null
}

/** Returns 2+ catalog items when a name reference is ambiguous. */
export function findAmbiguousCatalogMatches(history, searchName) {
  const norm = normalizeProductName(searchName)
  if (!norm) return []
  const items = activeCatalogProducts(history)
  const matches = items.filter((item) => {
    const name = normalizeProductName(item.name || '')
    if (!name) return false
    return name.includes(norm) || norm.includes(name)
  })
  return matches.length > 1 ? matches : []
}

export function buildDisambiguationReply(products) {
  const lines = products.slice(0, 6).map((p, i) => `${i + 1}. **${p.name}**`)
  return `Which product did you mean?\n\n${lines.join('\n')}\n\nReply with the number (e.g. **1**) or the product name.`
}

export async function resolveProductIdFromContext(history, userText, cartQueue = null) {
  const items = activeCatalogProducts(history)
  if (!items.length) return null

  const ordinal = resolveOrdinalCatalogProduct(userText, history)
  if (ordinal?.id) return ordinal.id

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
