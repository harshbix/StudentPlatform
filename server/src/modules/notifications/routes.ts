import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../../lib/async-handler";
import { requireAuth } from "../../middleware/auth";
import { validateParams } from "../../middleware/validate";
import { requireAuthContext } from "../../utils/auth-context";
import { supabaseAdmin } from "../../config/supabase";

const idParam = z.object({ id: z.string().uuid() });

export const notificationsRouter = Router();
notificationsRouter.use(requireAuth);

notificationsRouter.get(
  "/notifications",
  asyncHandler(async (req, res) => {
    const auth = requireAuthContext(req);
    const { data, error } = await supabaseAdmin
      .from("notifications")
      .select("*")
      .eq("user_id", auth.userId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    res.json(data);
  }),
);

notificationsRouter.patch(
  "/notifications/:id/read",
  validateParams(idParam),
  asyncHandler(async (req, res) => {
    const auth = requireAuthContext(req);

    const { data, error } = await supabaseAdmin
      .from("notifications")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("id", req.params.id)
      .eq("user_id", auth.userId)
      .select("*")
      .single();

    if (error) throw error;
    res.json(data);
  }),
);
