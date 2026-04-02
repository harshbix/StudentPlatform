import { z } from "zod";

export const createAnnouncementSchema = z
  .object({
    university_id: z.string().uuid(),
    scope: z.enum(["class", "department", "university"]),
    class_id: z.string().uuid().optional(),
    department_id: z.string().uuid().optional(),
    title: z.string().min(1),
    body: z.string().min(1),
    priority: z.enum(["low", "normal", "high"]).default("normal"),
    expires_at: z.string().datetime().optional(),
  })
  .refine(
    (v) =>
      (v.scope === "class" && !!v.class_id && !v.department_id) ||
      (v.scope === "department" && !!v.department_id && !v.class_id) ||
      (v.scope === "university" && !v.class_id && !v.department_id),
    { message: "Scope and target IDs are inconsistent" },
  );

export const idParam = z.object({ id: z.string().uuid() });

export const paginationSchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
});
