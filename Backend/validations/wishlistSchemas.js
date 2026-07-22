import { z } from 'zod'

const wishlistItemInputSchema = z.object({
  _id: z.string().trim().min(1),
  name: z.string().optional(),
  price: z.number().optional(),
  image: z.string().optional(),
  brand: z.string().optional(),
})

export const wishlistProductSchema = z.object({
  productId: z.string().trim().min(1),
})

export const syncWishlistSchema = z.object({
  items: z.array(wishlistItemInputSchema).optional(),
})
