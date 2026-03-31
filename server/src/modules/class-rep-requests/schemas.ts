import { z } from "zod";

export const createRequestSchema = z.object({
  class_id: z.string().uuid(),
  request_reason: z.string().max(500).optional(),
});

export const reviewRequestSchema = z.object({
  status: z.enum(["approved", "rejected"]),
  rejection_reason: z.string().max(500).optional(),
});

export const idParam = z.object({ id: z.string().uuid() });
