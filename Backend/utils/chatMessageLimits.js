import {
  CHAT_MESSAGE_MAX_LENGTH,
  CHAT_SESSION_MESSAGE_MAX_LENGTH,
} from '../constants/chatLimits.js'

export function clampChatText(text, maxLen = CHAT_MESSAGE_MAX_LENGTH) {
  const s = String(text ?? '')
  if (s.length <= maxLen) return s
  return s.slice(0, maxLen)
}

export function clampSessionMessageText(text) {
  return clampChatText(text, CHAT_SESSION_MESSAGE_MAX_LENGTH)
}
