import { z } from 'zod'

const orderItemSchema = z.object({
  _id: z.string().trim().min(1),
  name: z.string().trim().min(1),
  qty: z.number().int().min(1),
  price: z.number().min(0),
  totalPrice: z.number().min(0).optional(),
  color: z.string().trim().min(1),
  size: z.string().trim().min(1),
  description: z.string().optional(),
  image: z.string().optional(),
})

const shippingAddressSchema = z.object({
  firstName: z.string().trim().min(1).max(50),
  lastName: z.string().trim().min(1).max(50),
  address: z.string().trim().min(1).max(200),
  city: z.string().trim().min(1).max(100),
  province: z.string().trim().min(1).max(100),
  postalCode: z.string().trim().min(1).max(20),
  country: z.string().trim().min(1).max(100),
  phone: z.string().trim().min(1).max(20),
})

export const createOrderSchema = z.object({
  orderItems: z.array(orderItemSchema).min(1),
  shippingAddress: shippingAddressSchema,
})
