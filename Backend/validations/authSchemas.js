import { z } from "zod";

export const registerSchema = z.object({
  fullname: z.string().trim().min(2).max(50),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(6).max(100),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});
