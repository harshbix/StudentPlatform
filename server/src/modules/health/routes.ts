import { Router } from "express";
import { asyncHandler } from "../../lib/async-handler";
import { supabaseAdmin } from "../../config/supabase";

export const healthRouter = Router();

healthRouter.get(
  "/health",
  asyncHandler(async (_req, res) => {
    res.json({ status: "ok", service: "server" });
  }),
);

healthRouter.get(
  "/health/db",
  asyncHandler(async (_req, res) => {
    const { error } = await supabaseAdmin.from("universities").select("id").limit(1);
    if (error) {
      return res.status(503).json({ status: "degraded", db: "down" });
    }
    return res.json({ status: "ok", db: "up" });
  }),
);
