import { z } from "zod";

export const updateOwnProfileSchema = z.object({
  full_name: z.string().min(1).max(120).optional(),
  avatar_url: z.string().url().optional(),
});

export const idParamSchema = z.object({
  id: z.string().uuid(),
});
