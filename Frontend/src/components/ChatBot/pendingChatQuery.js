const STORAGE_KEY = 'shopai_pending_chat_query'
const MAX_AGE_MS = 60 * 60 * 1000

export function storePendingChatQuery(query, returnPath = '/assistant') {
  const text = String(query || '').trim()
  if (!text) return

  sessionStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      query: text,
      returnPath: returnPath || '/assistant',
      savedAt: Date.now(),
    })
  )
}

export function readPendingChatQuery() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null

    const parsed = JSON.parse(raw)
    if (!parsed?.query) return null

    if (parsed.savedAt && Date.now() - parsed.savedAt > MAX_AGE_MS) {
      sessionStorage.removeItem(STORAGE_KEY)
      return null
    }

    return parsed
  } catch {
    return null
  }
}

export function clearPendingChatQuery() {
  sessionStorage.removeItem(STORAGE_KEY)
}
