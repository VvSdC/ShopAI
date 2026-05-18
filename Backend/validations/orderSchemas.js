import { z } from "zod";

const orderItemSchema = z.object({
  name: z.string().trim().min(1),
  qty: z.number().int().min(1),
  price: z.number().min(0),
  color: z.string().trim().min(1),
  size: z.string().trim().min(1),
});

const shippingAddressSchema = z.object({
  firstName: z.string().trim().min(1).max(50),
  lastName: z.string().trim().min(1).max(50),
  address: z.string().trim().min(1).max(200),
  city: z.string().trim().min(1).max(100),
  province: z.string().trim().min(1).max(100),
  postalCode: z.string().trim().min(1).max(20),
  country: z.string().trim().min(1).max(100),
  phone: z.string().trim().min(1).max(20),
});

export const createOrderSchema = z.object({
  orderItems: z.array(orderItemSchema).min(1),
  shippingAddress: shippingAddressSchema,
});
