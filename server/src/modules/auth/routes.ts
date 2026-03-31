import { Router } from "express";
import { asyncHandler } from "../../lib/async-handler";
import { validateBody } from "../../middleware/validate";
import { loginSchema, signupSchema } from "./schemas";
import { supabaseAdmin, supabaseAnon } from "../../config/supabase";
import { requireAuth } from "../../middleware/auth";
import { requireAuthContext } from "../../utils/auth-context";
import { conflict } from "../../utils/errors";

export const authRouter = Router();

authRouter.post(
  "/auth/signup",
  validateBody(signupSchema),
  asyncHandler(async (req, res) => {
    const { email, password, full_name } = req.body;
    const { data, error } = await supabaseAnon.auth.signUp({ email, password });
    if (error || !data.user) throw conflict(error?.message ?? "Signup failed");

    await supabaseAdmin.from("profiles").upsert({
      id: data.user.id,
      full_name: full_name ?? null,
    });

    res.status(201).json({ user_id: data.user.id, email: data.user.email });
  }),
);

authRouter.post(
  "/auth/login",
  validateBody(loginSchema),
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const { data, error } = await supabaseAnon.auth.signInWithPassword({ email, password });
    if (error || !data.session) throw conflict(error?.message ?? "Login failed");

    res.json({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_at: data.session.expires_at,
      user: { id: data.user.id, email: data.user.email },
    });
  }),
);

authRouter.get(
  "/auth/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const auth = requireAuthContext(req);
    res.json({
      user: { id: auth.userId, email: auth.email },
      profile: auth.profile ?? null,
      roles: auth.roles,
    });
  }),
);
