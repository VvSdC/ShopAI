import { z } from 'zod'
import {
  CHAT_HISTORY_MAX_ITEMS,
  CHAT_MESSAGE_MAX_LENGTH,
} from '../constants/chatLimits.js'

const chatHistoryEntrySchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z
    .string()
    .max(
      CHAT_MESSAGE_MAX_LENGTH,
      `History message must be at most ${CHAT_MESSAGE_MAX_LENGTH} characters`
    ),
})

export const chatMessageSchema = z.object({
  message: z
    .string()
    .trim()
    .min(1, 'Message is required')
    .max(
      CHAT_MESSAGE_MAX_LENGTH,
      `Message must be at most ${CHAT_MESSAGE_MAX_LENGTH} characters`
    ),
  history: z
    .array(chatHistoryEntrySchema)
    .max(
      CHAT_HISTORY_MAX_ITEMS,
      `History may contain at most ${CHAT_HISTORY_MAX_ITEMS} messages`
    )
    .optional(),
  sessionId: z.string().trim().min(1).optional(),
})
