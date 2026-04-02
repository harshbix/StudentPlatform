import { z } from "zod";

export const updateOwnProfileSchema = z.object({
  full_name: z.string().min(1).max(120).optional(),
  avatar_url: z.string().url().optional(),
});

export const idParamSchema = z.object({
  id: z.string().uuid(),
});

export const paginationSchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
});
