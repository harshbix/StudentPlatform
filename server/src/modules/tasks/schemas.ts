import { z } from "zod";

export const createTaskSchema = z.object({
  class_id: z.string().uuid(),
  title: z.string().min(1),
  description: z.string().optional(),
  due_at: z.string().datetime(),
  proof_type: z.enum(["text", "file", "both"]),
  status: z.enum(["draft", "published", "closed"]).default("draft"),
});

export const updateTaskSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  due_at: z.string().datetime().optional(),
  proof_type: z.enum(["text", "file", "both"]).optional(),
  status: z.enum(["draft", "published", "closed"]).optional(),
});

export const idParam = z.object({ id: z.string().uuid() });

export const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});
