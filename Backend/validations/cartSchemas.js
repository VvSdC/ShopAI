import { z } from 'zod'

const cartItemInputSchema = z.object({
  _id: z.string().trim().min(1),
  name: z.string().optional(),
  qty: z.number().int().min(1).optional(),
  price: z.number().optional(),
  totalPrice: z.number().optional(),
  color: z.string().trim().min(1),
  size: z.string().trim().min(1),
  description: z.string().optional(),
  image: z.string().optional(),
})

export const addCartItemSchema = z.object({
  productId: z.string().trim().min(1),
  color: z.string().trim().min(1),
  size: z.string().trim().min(1),
  qty: z.number().int().min(1).optional(),
})

export const updateCartItemSchema = z.object({
  productId: z.string().trim().min(1),
  color: z.string().trim().min(1),
  size: z.string().trim().min(1),
  qty: z.number().int().min(0),
})

export const removeCartItemSchema = z.object({
  productId: z.string().trim().min(1),
  color: z.string().trim().min(1),
  size: z.string().trim().min(1),
})

export const applyCartCouponSchema = z.object({
  code: z.string().trim().min(1),
})

export const syncCartSchema = z.object({
  items: z.array(cartItemInputSchema).optional(),
})
