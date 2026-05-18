import { z } from "zod";

export const createReviewSchema = z.object({
  message: z.string().trim().min(3).max(1000),
  rating: z.number().int().min(1).max(5),
});

export const updateReviewSchema = z.object({
  message: z.string().trim().min(3).max(1000).optional(),
  rating: z.number().int().min(1).max(5).optional(),
});
