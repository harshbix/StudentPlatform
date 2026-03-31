import { z } from "zod";

export const createDepartmentSchema = z.object({
  university_id: z.string().uuid(),
  name: z.string().min(2),
  code: z.string().max(32).optional(),
});

export const updateDepartmentSchema = z.object({
  name: z.string().min(2).optional(),
  code: z.string().max(32).optional(),
});

export const idParam = z.object({ id: z.string().uuid() });
