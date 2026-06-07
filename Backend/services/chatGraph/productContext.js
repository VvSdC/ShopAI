export function extractProductsFromHistory(history) {
  const items = []
  const seen = new Set()

  for (const message of history || []) {
    if (message.role !== 'assistant') continue
    const content = String(message.content || '')

    const linkedPattern =
      /\*\*([^*]+)\*\*[^[]*\[View product\]\(\/products\/([a-f0-9]{24})\)/gi
    let match
    while ((match = linkedPattern.exec(content)) !== null) {
      const id = match[2]
      if (!seen.has(id)) {
        seen.add(id)
        items.push({ id, name: match[1].trim() })
      }
    }

    const urlPattern = /\/products\/([a-f0-9]{24})/gi
    while ((match = urlPattern.exec(content)) !== null) {
      const id = match[1]
      if (!seen.has(id)) {
        seen.add(id)
        items.push({ id, name: '' })
      }
    }
  }

  return items
}

function scoreProductMatch(name, userText) {
  const productName = name.toLowerCase()
  const query = userText.toLowerCase()
  let score = 0

  const queryWords = query.split(/\s+/).filter((w) => w.length > 2)
  for (const word of queryWords) {
    if (productName.includes(word)) score += 2
  }

  if (/\b(men'?s?|mens)\b/.test(query) && /\bmen\b/.test(productName)) score += 3
  if (/\b(women'?s?|womens|lad(?:y|ies))\b/.test(query) && /\bwomen\b/.test(productName)) score += 3
  if (/\bshirt\b/.test(query) && /\bshirt\b/.test(productName)) score += 3
  if (/\bjack\b/.test(query) && /\bjack\b/.test(productName)) score += 2

  return score
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
  if (/\b(extra extra large|double extra large|xxl)\b/.test(t)) size = 'XXL'
  else if (/\b(extra large|x-large|xlarge|\bxl\b)\b/.test(t)) size = 'XL'
  else if (/\b(large|\bl\b)\b/.test(t) && !/\bxl\b/.test(t)) size = 'L'
  else if (/\b(medium|\bm\b)\b/.test(t)) size = 'M'
  else if (/\b(small|\bs\b)\b/.test(t)) size = 'S'

  let color = null
  for (const c of ['red', 'blue', 'black', 'white', 'green', 'navy', 'pink', 'yellow', 'grey', 'gray']) {
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
  if (/\b(extra extra large|double extra large|xxl)\b/.test(t)) size = 'XXL'
  else if (/\b(extra large|x-large|xlarge|\bxl\b)\b/.test(t)) size = 'XL'
  else if (/\b(large|\bl\b)\b/.test(t) && !/\bxl\b/.test(t)) size = 'L'
  else if (/\b(medium|\bm\b)\b/.test(t)) size = 'M'
  else if (/\b(small|\bs\b)\b/.test(t)) size = 'S'

  let color = null
  for (const c of ['red', 'blue', 'black', 'white', 'green', 'navy', 'pink', 'yellow', 'grey', 'gray']) {
    if (new RegExp(`\\b${c}\\b`).test(t)) {
      color = c
      break
    }
  }

  return { qty, size, color }
}

export function inferPurchaseFromContext(userText, history = []) {
  const explicit = parsePurchaseIntent(userText)
  if (explicit) return explicit

  if (!extractProductsFromHistory(history).length) return null

  const { qty, size, color } = extractSizeColorQty(userText)
  if (qty || size || color) {
    return { qty: qty || 1, size, color }
  }

  return null
}

export function isAddToCartVariantIntent(userText, history = []) {
  if (!extractProductsFromHistory(history).length) return false
  return Boolean(inferPurchaseFromContext(userText, history))
}

export function resolveProductIdFromContext(history, userText) {
  const items = extractProductsFromHistory(history)
  if (!items.length) return null

  const text = String(userText || '')
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

  if (parsePurchaseIntent(text)) {
    return items[items.length - 1].id
  }

  return null
}
