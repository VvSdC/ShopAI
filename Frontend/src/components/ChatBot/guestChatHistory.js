const GUEST_ASSISTANT_MESSAGES_KEY = 'shopai_guest_assistant_messages'

export function extractCatalogFromBlocks(blocks) {
  const listing = (blocks || []).find((b) => b.type === 'product_listing')
  if (!listing?.products?.length) return null
  return listing.products.slice(0, 12).map((p) => ({
    id: p.id,
    name: p.name,
  }))
}

export function enrichAssistantMessage(msg, data = {}) {
  const catalogProducts =
    data.catalogProducts || extractCatalogFromBlocks(data.blocks || msg.blocks)
  const messageKind =
    data.messageKind ??
    msg.messageKind ??
    ((data.blocks || msg.blocks)?.some((b) => b.type === 'product_listing')
      ? 'product_listing'
      : null)
  return {
    ...msg,
    content: data.reply ?? msg.content,
    checkout: data.checkout ?? msg.checkout ?? null,
    blocks: data.blocks ?? msg.blocks ?? null,
    messageKind,
    catalogProducts: catalogProducts || msg.catalogProducts || null,
    streaming: false,
    failed: false,
    retryText: null,
  }
}

export function buildGuestHistory(messages) {
  return (messages || [])
    .filter((m) => (m.role === 'user' || m.role === 'assistant') && m.content && !m.streaming)
    .slice(-20)
    .map((m) => {
      const entry = { role: m.role, content: m.content }
      if (m.messageKind) entry.messageKind = m.messageKind
      const catalog = m.catalogProducts || extractCatalogFromBlocks(m.blocks)
      if (catalog?.length) entry.catalogProducts = catalog
      return entry
    })
}

export function readGuestAssistantMessages() {
  try {
    const raw = sessionStorage.getItem(GUEST_ASSISTANT_MESSAGES_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function writeGuestAssistantMessages(messages) {
  try {
    sessionStorage.setItem(
      GUEST_ASSISTANT_MESSAGES_KEY,
      JSON.stringify((messages || []).slice(-40))
    )
  } catch {
    /* sessionStorage unavailable */
  }
}

export function clearGuestAssistantMessages() {
  try {
    sessionStorage.removeItem(GUEST_ASSISTANT_MESSAGES_KEY)
  } catch {
    /* sessionStorage unavailable */
  }
}

export function welcomeSuggestedPromptsBlock(prompts) {
  return {
    type: 'suggested_prompts',
    prompts: (prompts || []).map((p) =>
      typeof p === 'string' ? { label: p, message: p } : p
    ),
  }
}
