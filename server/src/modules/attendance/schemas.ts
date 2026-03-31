import { z } from "zod";

export const createSessionSchema = z.object({
  class_id: z.string().uuid(),
  starts_at: z.string().datetime(),
  ends_at: z.string().datetime(),
  suspicious: z.boolean().default(false),
  suspicion_reason: z.string().max(500).optional(),
  verification_photo_url: z.string().url().optional(),
});

export const markAttendanceSchema = z.object({
  session_id: z.string().uuid(),
  verification_photo_url: z.string().url().optional(),
});

export const closeSessionSchema = z.object({
  status: z.enum(["closed", "flagged"]).default("closed"),
  suspicious: z.boolean().optional(),
  suspicion_reason: z.string().max(500).optional(),
  verification_photo_url: z.string().url().optional(),
});

export const idParam = z.object({ id: z.string().uuid() });
