import { z } from "zod";

export const createReviewSchema = z.object({
  message: z.string().trim().min(3).max(1000),
  rating: z.number().int().min(1).max(5),
});

export const updateReviewSchema = z.object({
  message: z.string().trim().min(3).max(1000).optional(),
  rating: z.number().int().min(1).max(5).optional(),
});

export const adminModerateReviewSchema = z.object({
  status: z.enum(["approved", "rejected"]),
  reason: z.string().trim().max(500).optional(),
});

export const adminListReviewsQuerySchema = z.object({
  status: z.enum(["pending", "approved", "rejected", "all"]).optional(),
});
