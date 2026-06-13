import { z } from "zod";
import { passwordSchema } from "./passwordPolicy.js";

export const registerSchema = z.object({
  fullname: z.string().trim().min(2).max(50),
  email: z.string().trim().toLowerCase().email(),
  password: passwordSchema,
  phone: z.string().trim().max(20).optional(),
  country: z.string().trim().max(80).optional(),
})

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: passwordSchema,
});

export const resetPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  otp: z.string().trim().min(6).max(6),
  password: passwordSchema,
});
