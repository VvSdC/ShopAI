import { z } from "zod";

export const chatMessageSchema = z.object({
  message: z.string().trim().min(1).max(2000),
  history: z.array(z.any()).optional(),
});
