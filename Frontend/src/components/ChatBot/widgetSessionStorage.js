const storageKey = (userId) => `shopai_widget_session_${userId}`

export function readWidgetSessionId(userId) {
  if (!userId) return null
  try {
    return sessionStorage.getItem(storageKey(userId))
  } catch {
    return null
  }
}

export function writeWidgetSessionId(userId, sessionId) {
  if (!userId || !sessionId) return
  try {
    sessionStorage.setItem(storageKey(userId), sessionId)
  } catch {
    /* sessionStorage unavailable */
  }
}

export function clearWidgetSessionId(userId) {
  if (!userId) return
  try {
    sessionStorage.removeItem(storageKey(userId))
  } catch {
    /* sessionStorage unavailable */
  }
}
