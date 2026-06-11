import { CHAT_HISTORY_TOKEN_BUDGET, CHAT_MESSAGE_MAX_LENGTH } from '../constants/chatLimits.js'
import { clampChatText } from './chatMessageLimits.js'

/** Fast token estimate — ~4 characters per token for English prose. */
export function estimateTextTokens(text) {
  const len = String(text ?? '').length
  if (len === 0) return 0
  return Math.ceil(len / 4)
}

export function estimateMessageTokens(message) {
  if (!message) return 0
  const content =
    typeof message.content === 'string'
      ? message.content
      : JSON.stringify(message.content ?? '')
  return 4 + estimateTextTokens(content)
}

/**
 * Drop oldest history messages until estimated tokens fit the budget.
 * Does not include system prompt or the current user turn — those are added separately.
 */
export function trimHistoryToTokenBudget(
  history,
  tokenBudget = CHAT_HISTORY_TOKEN_BUDGET
) {
  if (!Array.isArray(history) || history.length === 0) return []
  if (!Number.isFinite(tokenBudget) || tokenBudget <= 0) return []

  const messages = history.map((m) => ({
    role: m.role === 'user' ? 'user' : 'assistant',
    content: String(m.content ?? ''),
  }))

  let total = messages.reduce((sum, m) => sum + estimateMessageTokens(m), 0)
  if (total <= tokenBudget) return messages

  let start = 0
  while (start < messages.length && total > tokenBudget) {
    total -= estimateMessageTokens(messages[start])
    start += 1
  }

  return messages.slice(start)
}

export function normalizeChatHistoryMessage(message) {
  return {
    role: message.role === 'user' ? 'user' : 'assistant',
    content: clampChatText(String(message.content ?? ''), CHAT_MESSAGE_MAX_LENGTH),
  }
}

export function prepareChatHistoryForLlm(
  history,
  tokenBudget = CHAT_HISTORY_TOKEN_BUDGET
) {
  const normalized = (Array.isArray(history) ? history : []).map(normalizeChatHistoryMessage)
  return trimHistoryToTokenBudget(normalized, tokenBudget)
}
