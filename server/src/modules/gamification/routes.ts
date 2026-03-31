import { Router } from "express";
import { asyncHandler } from "../../lib/async-handler";
import { requireAuth } from "../../middleware/auth";
import { requireAuthContext } from "../../utils/auth-context";
import { supabaseAdmin } from "../../config/supabase";

export const gamificationRouter = Router();
gamificationRouter.use(requireAuth);

gamificationRouter.get(
  "/gamification/summary",
  asyncHandler(async (req, res) => {
    const auth = requireAuthContext(req);

    const [{ data: profile, error: pErr }, { data: xpEvents, error: xErr }, { data: streaks, error: sErr }] = await Promise.all([
      supabaseAdmin.from("profiles").select("xp, streak_count").eq("id", auth.userId).single(),
      supabaseAdmin.from("xp_events").select("id,source,points,created_at").eq("user_id", auth.userId).order("created_at", { ascending: false }).limit(50),
      supabaseAdmin.from("streak_logs").select("activity_date,source").eq("user_id", auth.userId).order("activity_date", { ascending: false }).limit(30),
    ]);

    if (pErr || xErr || sErr) throw pErr || xErr || sErr;

    res.json({
      xp: profile.xp,
      streak_count: profile.streak_count,
      xp_events: xpEvents,
      streak_logs: streaks,
    });
  }),
);
