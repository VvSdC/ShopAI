/** Max characters per user/assistant chat message sent to the LLM. */
export const CHAT_MESSAGE_MAX_LENGTH = 2000

/** Max prior turns accepted from the client when no server session is used. */
export const CHAT_HISTORY_MAX_ITEMS = 20

/** Max estimated tokens for prior user/assistant history sent to the LLM (system + current turn are extra). */
export const CHAT_HISTORY_TOKEN_BUDGET = 8000

/** Max characters stored per message in a chat session document. */
export const CHAT_SESSION_MESSAGE_MAX_LENGTH = 4000
