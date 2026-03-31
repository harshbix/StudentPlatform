import type { NextFunction, Request, Response } from "express";
import { supabaseAdmin } from "../config/supabase";
import { unauthenticated } from "../utils/errors";

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) throw unauthenticated();

    const token = header.slice("Bearer ".length);
    const { data: authData, error: authErr } = await supabaseAdmin.auth.getUser(token);
    if (authErr || !authData.user) throw unauthenticated();

    const userId = authData.user.id;

    const [{ data: profile, error: profileErr }, { data: roles, error: roleErr }] = await Promise.all([
      supabaseAdmin
        .from("profiles")
        .select("id, university_id, class_id, status, xp, streak_count")
        .eq("id", userId)
        .maybeSingle(),
      supabaseAdmin
        .from("user_roles")
        .select("role, university_id, class_id")
        .eq("user_id", userId),
    ]);

    if (profileErr || roleErr) throw unauthenticated("Unable to resolve authorization context");

    req.auth = {
      userId,
      email: authData.user.email,
      profile: profile ?? undefined,
      roles: roles ?? [],
    };

    next();
  } catch (err) {
    next(err);
  }
}
