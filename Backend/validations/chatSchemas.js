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

export const guestChatMessageSchema = z
  .object({
    message: z
      .string()
      .trim()
      .min(1, 'Message is required')
      .max(
        CHAT_MESSAGE_MAX_LENGTH,
        `Message must be at most ${CHAT_MESSAGE_MAX_LENGTH} characters`
      ),
    history: z
      .array(
        z
          .object({
            role: z.enum(['user', 'assistant']),
            content: z.string().max(CHAT_MESSAGE_MAX_LENGTH),
            messageKind: z.string().max(48).optional(),
            catalogProducts: z
              .array(
                z.object({
                  id: z.string().max(24).optional(),
                  name: z.string().max(200).optional(),
                })
              )
              .max(20)
              .optional(),
          })
          .strict()
      )
      .max(40)
      .optional(),
    localCart: z.array(z.record(z.unknown())).max(50).optional(),
  })
  .strict()
