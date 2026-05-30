import { z } from 'zod'

const returnItemSchema = z.object({
  lineId: z.string().trim().min(1),
  qty: z.number().int().min(1),
  reasonCode: z.string().trim().min(1),
  reasonComment: z.string().trim().max(500).optional(),
})

export const createReturnSchema = z.object({
  items: z.array(returnItemSchema).min(1),
})

export const rejectReturnSchema = z.object({
  adminNote: z.string().trim().min(3).max(1000),
})

export const approveReturnSchema = z.object({
  adminNote: z.string().trim().max(1000).optional(),
})
