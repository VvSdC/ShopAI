import { CHAT_HISTORY_TOKEN_BUDGET, CHAT_MESSAGE_MAX_LENGTH } from '../constants/chatLimits.js'
import { clampChatText } from './chatMessageLimits.js'

/** Fast token estimate — ~4 characters per token for English prose. */
export function estimateTextTokens(text) {
  const len = String(text ?? '').length
  if (len === 0) return 0
  return Math.ceil(len / 4)
}

function estimateStructuredTokens(value) {
  if (value == null) return 0
  if (typeof value === 'string') return estimateTextTokens(value)
  return estimateTextTokens(JSON.stringify(value))
}

export function estimateMessageTokens(message) {
  if (!message) return 0

  let tokens = 4

  if (Array.isArray(message.content)) {
    tokens += message.content.reduce(
      (sum, part) => sum + estimateStructuredTokens(part),
      0
    )
  } else if (typeof message.content === 'string') {
    tokens += estimateTextTokens(message.content)
  } else if (message.content != null) {
    tokens += estimateStructuredTokens(message.content)
  }

  if (Array.isArray(message.tool_calls) && message.tool_calls.length) {
    tokens += estimateStructuredTokens(message.tool_calls)
  }

  if (message.tool_call_id) {
    tokens += estimateTextTokens(String(message.tool_call_id))
  }

  return tokens
}

function normalizeMessageForTrim(message) {
  if (!message || typeof message !== 'object') return null

  const role = message.role
  if (!role) return null

  const normalized = {
    role,
    content: message.content ?? '',
  }

  if (Array.isArray(message.tool_calls) && message.tool_calls.length) {
    normalized.tool_calls = message.tool_calls
  }
  if (message.tool_call_id) {
    normalized.tool_call_id = message.tool_call_id
  }

  return normalized
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

  const messages = history.map(normalizeMessageForTrim).filter(Boolean)

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
