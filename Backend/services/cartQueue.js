const QUEUE_RE = /\[\/\/\]:\s*#\s*\(cart-queue\s*(\{[\s\S]*?\})\)\s*$/m

export function parseCartQueueFromHistory(history) {
  for (let i = history.length - 1; i >= 0; i--) {
    const msg = history[i]
    if (msg.role !== 'assistant') continue
    const content = String(msg.content || '')
    const match = content.match(QUEUE_RE)
    if (!match) continue
    try {
      return JSON.parse(match[1])
    } catch {
      return null
    }
  }
  return null
}

export function embedCartQueue(reply, queue) {
  if (!queue?.remaining?.length) return reply
  return `${reply}\n\n[//]: # (cart-queue ${JSON.stringify(queue)})`
}

export function stripCartQueueMarker(content) {
  return String(content || '').replace(QUEUE_RE, '').trim()
}
