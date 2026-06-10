import { parseCartQueueFromHistory } from '../cartQueue.js'

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

/** Products from the most recent assistant catalog listing (avoids stale cricket items). */
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

function tokenizeForMatch(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2)
}

function fuzzyTokenMatch(a, b) {
  if (a === b) return true
  if (a.length < 4 || b.length < 4) return a.includes(b) || b.includes(a)
  return a.startsWith(b.slice(0, 4)) || b.startsWith(a.slice(0, 4))
}

export function scoreProductMatch(name, userText) {
  const productName = name.toLowerCase()
  const query = userText.toLowerCase()
  let score = 0

  const wantsMens = /\b(men'?s?|mens|men)\b/.test(query)
  const wantsWomens = /\b(women'?s?|womens|lad(?:y|ies)|women)\b/.test(query)
  const isMensProduct = /\bmen'?s?\b/.test(productName) && !/\bwomen\b/.test(productName)
  const isWomensProduct = /\bwomen'?s?\b/.test(productName)

  if (wantsMens && isWomensProduct) score -= 8
  if (wantsWomens && isMensProduct) score -= 8
  if (wantsMens && isMensProduct) score += 6
  if (wantsWomens && isWomensProduct) score += 6

  const queryWords = tokenizeForMatch(query)
  const productWords = tokenizeForMatch(productName)

  for (const word of queryWords) {
    if (word === 'men' && isWomensProduct) continue
    if (productName.includes(word)) score += 2
  }

  for (const pw of productWords) {
    for (const qw of queryWords) {
      if (qw === 'men' && isWomensProduct) continue
      if (fuzzyTokenMatch(pw, qw)) score += 1.5
    }
  }

  if (/\b(men'?s?|mens)\b/.test(query) && /\bmen'?s?\b/.test(productName) && !/\bwomen\b/.test(productName)) {
    score += 3
  }
  if (/\b(women'?s?|womens|lad(?:y|ies))\b/.test(query) && /\bwomen\b/.test(productName)) score += 3
  if (/\bshirt\b/.test(query) && /\bshirt\b/.test(productName)) score += 3
  if (/\bjack\b/.test(query) && /\bjack\b/.test(productName)) score += 2
  if (/\bbat\b/.test(query) && /\bbat\b/.test(productName) && !/\bball\b/.test(productName)) score += 4
  if (/\bball\b/.test(query) && /\bball\b/.test(productName)) score += 4
  if (/\bkookaburra\b/.test(query) && /\bkookaburra\b/.test(productName)) score += 3
  if (/\bleather\b/.test(query) && /\bleather\b/.test(productName)) score += 2

  return score
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
    t.match(/\b(\d+)\s*(?:x|×|shirt|shirts|item|items|piece|pieces|of)\b/) ||
    t.match(/\b(?:want|add|buy|get)\s+(\d+)\b/) ||
    t.match(/\b(\d+)\b/)
  return qtyMatch ? Math.max(1, parseInt(qtyMatch[1], 10)) : 1
}

export function resolveMultipleProductsFromContext(history, userText) {
  const items = activeCatalogProducts(history)
  const text = String(userText || '').toLowerCase()

  if (/\b(all of them|all of these|them all|add all|all items)\b/i.test(text)) {
    return items
      .filter((i) => i.name)
      .map((i) => ({ id: i.id, name: i.name, score: 10 }))
  }

  const scored = items
    .filter((i) => i.name)
    .map((i) => ({ id: i.id, name: i.name, score: scoreProductMatch(i.name, text) }))
    .filter((i) => i.score > 0)
    .sort((a, b) => b.score - a.score)

  const strong = scored.filter((s) => s.score >= 2)
  if (strong.length >= 2) return strong

  if (/\band\b|,|\bwith\b/.test(text)) {
    const conj = scored.filter((s) => s.score >= 1.5)
    if (conj.length >= 2) return conj
  }

  return strong.length ? strong : scored.slice(0, 1)
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

export function isVariantOnlyReply(userText, history = []) {
  const t = String(userText || '').toLowerCase()
  if (!getPendingCartProductName(history) && !parseCartQueueFromHistory(history)) {
    return false
  }
  const hasVariant =
    /\b(double extra large|extra extra large|xxl|xl|large|medium|small)\b/.test(t) ||
    /\b(xl|xxl|large|medium|small|red|blue|pink|cherry|white|wood|willow|color|size)\b/.test(t) ||
    /\bcloser to\b/.test(t) ||
    /\bworks\b/.test(t)
  const namesProduct = resolveMultipleProductsFromContext(history, userText).length > 0
  return hasVariant && !isExplicitAddIntent(userText) && !namesProduct
}


export function parsePurchaseIntent(userText) {
  const t = String(userText || '').toLowerCase()
  if (!/\b(want|add|buy|get|need|order)\b/.test(t)) return null

  const qtyMatch =
    t.match(/\b(\d+)\s*(?:x|×|shirt|shirts|item|items|piece|pieces|of)\b/) ||
    t.match(/\b(?:want|add|buy|get)\s+(\d+)\b/) ||
    t.match(/\b(\d+)\b/)
  const qty = qtyMatch ? Math.max(1, parseInt(qtyMatch[1], 10)) : 1

  let size = null
  if (/\b(extra extra large|double extra large|double xl|xxl)\b/.test(t)) size = 'XXL'
  else if (/\b(extra large|x-large|xlarge|\bxl\b)\b/.test(t)) size = 'XL'
  else if (/\b(large|\bl\b)\b/.test(t) && !/\bxl\b/.test(t)) size = 'L'
  else if (/\b(medium|\bm\b)\b/.test(t)) size = 'M'
  else if (/\b(small|\bs\b)\b/.test(t)) size = 'S'

  let color = null
  if (/\bcloser to red\b/i.test(t)) color = 'red'
  for (const c of ['red', 'blue', 'black', 'white', 'green', 'navy', 'pink', 'yellow', 'grey', 'gray', 'cherry', 'wooden', 'wood']) {
    if (new RegExp(`\\b${c}\\b`).test(t)) {
      color = c
      break
    }
  }

  if (!size && !color && !/\d+/.test(t)) return null
  return { qty, size, color }
}

function extractSizeColorQty(userText) {
  const t = String(userText || '').toLowerCase()

  const qtyMatch =
    t.match(/\b(\d+)\s*(?:x|×|shirt|shirts|item|items|piece|pieces|of)\b/) ||
    t.match(/\b(?:want|add|buy|get|need)\s+(\d+)\b/) ||
    t.match(/\b(\d+)\b/)
  const qty = qtyMatch ? Math.max(1, parseInt(qtyMatch[1], 10)) : null

  let size = null
  if (/\b(extra extra large|double extra large|double xl|xxl)\b/.test(t)) size = 'XXL'
  else if (/\b(extra large|x-large|xlarge|\bxl\b)\b/.test(t)) size = 'XL'
  else if (/\b(large|\bl\b)\b/.test(t) && !/\bxl\b/.test(t)) size = 'L'
  else if (/\b(medium|\bm\b)\b/.test(t)) size = 'M'
  else if (/\b(small|\bs\b)\b/.test(t)) size = 'S'

  let color = null
  if (/\bcloser to red\b/i.test(t)) color = 'red'
  for (const c of ['red', 'blue', 'black', 'white', 'green', 'navy', 'pink', 'yellow', 'grey', 'gray', 'cherry', 'wooden', 'wood']) {
    if (new RegExp(`\\b${c}\\b`).test(t)) {
      color = c
      break
    }
  }

  return { qty, size, color }
}

export function inferQtyProductIntent(userText) {
  const t = String(userText || '').toLowerCase()
  if (!/\b(shirt|shirts|tshirt|t-shirt|bat|ball|jersey|hoodie|jacket)\b/.test(t)) {
    return null
  }
  const qty = parseQuantityIntent(userText)
  if (qty > 1 || /\b(shirt|shirts|tshirt|bat|ball)\b/.test(t)) {
    return { qty, size: null, color: null }
  }
  return null
}

export function inferPurchaseFromContext(userText, history = []) {
  const explicit = parsePurchaseIntent(userText)
  if (explicit) return explicit

  if (!activeCatalogProducts(history).length) return null

  const qtyIntent = inferQtyProductIntent(userText)
  if (qtyIntent) return qtyIntent

  const { qty, size, color } = extractSizeColorQty(userText)
  if (qty || size || color) {
    return { qty: qty || 1, size, color }
  }

  return null
}

export function isAddToCartVariantIntent(userText, history = []) {
  if (!extractProductsFromHistory(history).length) return false
  if (isBulkAddIntent(userText)) return true
  if (isVariantOnlyReply(userText, history)) return true
  return Boolean(inferPurchaseFromContext(userText, history))
}

export function shouldAssistCart(userText, history = []) {
  if (!extractProductsFromHistory(history).length) return false
  if (isBulkAddIntent(userText)) return true
  if (isVariantOnlyReply(userText, history)) return true
  if (isExplicitAddIntent(userText)) return true
  return Boolean(inferPurchaseFromContext(userText, history))
}

export function resolveProductIdFromPending(history, pendingName) {
  if (!pendingName) return null
  const norm = normalizeProductName(pendingName)
  const items = activeCatalogProducts(history)
  const hit = items.find((i) => i.name && normalizeProductName(i.name) === norm)
  return hit?.id || null
}

export function resolveProductIdFromContext(history, userText) {
  const items = activeCatalogProducts(history)
  if (!items.length) return null

  const text = String(userText || '')

  const pending = getPendingCartProductName(history)
  if (pending && (isVariantOnlyReply(text, history) || parseCartQueueFromHistory(history))) {
    const pendingId = resolveProductIdFromPending(history, pending)
    if (pendingId) return pendingId
  }

  if (/\b(it|this|that|the one|this one)\b/i.test(text)) {
    return items[items.length - 1].id
  }

  let best = null
  let bestScore = 0
  for (const item of items) {
    if (!item.name) continue
    const score = scoreProductMatch(item.name, text)
    if (score > bestScore) {
      bestScore = score
      best = item.id
    }
  }

  if (best && bestScore > 0) return best
  if (items.length === 1) return items[0].id

  const multi = resolveMultipleProductsFromContext(history, text)
  if (multi.length === 1) return multi[0].id

  if (inferQtyProductIntent(text) || parsePurchaseIntent(text) || isVariantOnlyReply(text, history)) {
    if (pending) {
      const pendingId = resolveProductIdFromPending(history, pending)
      if (pendingId) return pendingId
    }
    const mensDefault = items.find(
      (i) => i.name && /\bmen'?s?\b/i.test(i.name) && !/\bwomen\b/i.test(i.name)
    )
    if (mensDefault && /\b(men'?s?|mens)\b/i.test(text)) return mensDefault.id
    return items[0].id
  }

  return null
}
