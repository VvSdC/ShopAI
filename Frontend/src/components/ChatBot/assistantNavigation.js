export const ASSISTANT_PATH = '/assistant'

export const assistantStartNewState = { startNew: true }

export function assistantSessionState(sessionId) {
  return sessionId ? { sessionId } : assistantStartNewState
}

/** Preserve Stripe payment return params when clearing chat navigation query/state. */
export function keepStripeReturnSearch(search) {
  const params = new URLSearchParams(search)
  if (params.get('payment') !== 'success' || !params.get('session_id')) return ''
  return `?payment=success&session_id=${encodeURIComponent(params.get('session_id'))}`
}
