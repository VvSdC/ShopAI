import { z } from 'zod'

export const PASSWORD_MIN_LENGTH = 8

export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters`)
  .max(100)
  .refine((value) => /[A-Za-z]/.test(value) && /\d/.test(value), {
    message: 'Password must include letters and numbers',
  })
