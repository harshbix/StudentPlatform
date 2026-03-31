import { z } from "zod";

export const universityCreateSchema = z.object({
  name: z.string().min(2),
  code: z.string().min(2).max(32).optional(),
  status: z.enum(["active", "inactive", "suspended"]).optional(),
});

export const universityUpdateSchema = z.object({
  name: z.string().min(2).optional(),
  code: z.string().min(2).max(32).optional(),
  status: z.enum(["active", "inactive", "suspended"]).optional(),
});

export const universityIdParam = z.object({ id: z.string().uuid() });
