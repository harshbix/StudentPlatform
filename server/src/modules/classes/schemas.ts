import { z } from "zod";

export const createClassSchema = z.object({
  university_id: z.string().uuid(),
  department_id: z.string().uuid().optional(),
  name: z.string().min(2),
  code: z.string().max(32).optional(),
});

export const updateClassSchema = z.object({
  name: z.string().min(2).optional(),
  code: z.string().max(32).optional(),
  department_id: z.string().uuid().nullable().optional(),
});

export const assignStudentSchema = z.object({
  student_id: z.string().uuid(),
  class_id: z.string().uuid(),
});

export const assignClassRepSchema = z.object({
  class_id: z.string().uuid(),
  user_id: z.string().uuid(),
});

export const classIdParam = z.object({ id: z.string().uuid() });
