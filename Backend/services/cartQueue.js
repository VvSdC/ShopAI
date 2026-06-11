/** Legacy cart-queue marker embedded in assistant markdown (pre-session-field storage). */
const QUEUE_RE = /\[\/\/\]:\s*#\s*\(cart-queue\s*(\{[\s\S]*?\})\)\s*$/m

export function normalizeCartQueue(queue) {
  if (!queue?.remaining?.length) return null
  const remaining = queue.remaining
    .map((item) => ({
      productId: String(item.productId || ''),
      name: String(item.name || '').trim(),
      qty: Math.max(1, Number(item.qty) || 1),
    }))
    .filter((item) => item.productId && item.name)
  return remaining.length ? { remaining } : null
}

export function hasActiveCartQueue(queue) {
  return Boolean(normalizeCartQueue(queue))
}

/** Prefer session cartQueue; fall back to legacy markdown markers in history. */
export function resolveActiveCartQueue(history, sessionQueue = null) {
  const fromSession = normalizeCartQueue(sessionQueue)
  if (fromSession) return fromSession
  return parseCartQueueFromHistory(history)
}

export function parseCartQueueFromHistory(history) {
  for (let i = history.length - 1; i >= 0; i--) {
    const msg = history[i]
    if (msg.role !== 'assistant') continue
    const content = String(msg.content || '')
    const match = content.match(QUEUE_RE)
    if (!match) continue
    try {
      return normalizeCartQueue(JSON.parse(match[1]))
    } catch {
      return null
    }
  }
  return null
}

export function stripCartQueueMarker(content) {
  return String(content || '').replace(QUEUE_RE, '').trim()
}
