/** Max characters per user/assistant chat message sent to the LLM. */
export const CHAT_MESSAGE_MAX_LENGTH = 2000

/** Max prior turns accepted from the client when no server session is used. */
export const CHAT_HISTORY_MAX_ITEMS = 20

/** Max estimated tokens for prior user/assistant history sent to the LLM (system + current turn are extra). */
export const CHAT_HISTORY_TOKEN_BUDGET = 8000

/** Max characters stored per message in a chat session document. */
export const CHAT_SESSION_MESSAGE_MAX_LENGTH = 4000

/** Messages returned per page when loading a session in the UI. */
export const CHAT_SESSION_CLIENT_PAGE_SIZE = 20

/** Guard + intent classifiers — JSON with one or two fields. */
export const LLM_MAX_TOKENS_CLASSIFIER = 100

/** Fused safety + routing classifier — single compact JSON object. */
export const LLM_MAX_TOKENS_FUSED = 60

/** Structured cart/product intent extraction — compact JSON. */
export const LLM_MAX_TOKENS_PURCHASE_INTENT = 120

/** Greeting, policies, and other short conversational replies. */
export const LLM_MAX_TOKENS_GREETING_POLICIES = 512

/** Product search, checkout, detail, orders, payment agent routes. */
export const LLM_MAX_TOKENS_AGENT = 1024

/** Side-by-side product comparison (longer structured replies). */
export const LLM_MAX_TOKENS_COMPARISON = 2048

/** Default for non-route callers (moderation, tagging, eval). */
export const LLM_MAX_TOKENS_DEFAULT = 512

/** @param {string} route */
export function getMaxTokensForRoute(route) {
  switch (route) {
    case 'comparison':
      return LLM_MAX_TOKENS_COMPARISON
    case 'general':
    case 'policies':
      return LLM_MAX_TOKENS_GREETING_POLICIES
    case 'retrieval':
    case 'checkout':
    case 'product_detail':
    case 'payment':
    case 'order_summary':
    case 'order_update':
      return LLM_MAX_TOKENS_AGENT
    default:
      return LLM_MAX_TOKENS_GREETING_POLICIES
  }
}
