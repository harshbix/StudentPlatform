import { z } from "zod";

export const createSubmissionSchema = z
  .object({
    task_id: z.string().uuid(),
    text_response: z.string().optional(),
    file_url: z.string().url().optional(),
  })
  .refine((v) => !!v.text_response || !!v.file_url, { message: "text_response or file_url is required" });

export const reviewSubmissionSchema = z.object({
  status: z.enum(["approved", "rejected"]),
  feedback: z.string().max(1000).optional(),
});

export const idParam = z.object({ id: z.string().uuid() });
