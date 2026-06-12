import { z } from 'zod'
import { CHAT_MESSAGE_MAX_LENGTH } from '../constants/chatLimits.js'

export const chatMessageSchema = z
  .object({
    message: z
      .string()
      .trim()
      .min(1, 'Message is required')
      .max(
        CHAT_MESSAGE_MAX_LENGTH,
        `Message must be at most ${CHAT_MESSAGE_MAX_LENGTH} characters`
      ),
    sessionId: z.string().trim().min(1).optional(),
  })
  .strict()
