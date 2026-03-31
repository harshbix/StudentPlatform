import { Router } from "express";
import { asyncHandler } from "../../lib/async-handler";
import { requireAuth } from "../../middleware/auth";
import { validateBody, validateParams } from "../../middleware/validate";
import { supabaseAdmin } from "../../config/supabase";
import { requireAuthContext, requireProfile } from "../../utils/auth-context";
import { ensure } from "../../middleware/require-scope";
import { idParamSchema, updateOwnProfileSchema } from "./schemas";

export const profilesRouter = Router();
profilesRouter.use(requireAuth);

profilesRouter.get(
  "/profiles/me",
  asyncHandler(async (req, res) => {
    const auth = requireAuthContext(req);
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("id", auth.userId)
      .single();

    if (error) throw error;
    res.json(data);
  }),
);

profilesRouter.patch(
  "/profiles/me",
  validateBody(updateOwnProfileSchema),
  asyncHandler(async (req, res) => {
    const auth = requireAuthContext(req);
    const payload = req.body;
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .update(payload)
      .eq("id", auth.userId)
      .select("*")
      .single();

    if (error) throw error;
    res.json(data);
  }),
);

profilesRouter.get(
  "/profiles/class-members",
  asyncHandler(async (req, res) => {
    const auth = requireAuthContext(req);
    const profile = requireProfile(req);

    const canView = auth.roles.some((r) => ["class_representative", "student", "university_admin", "platform_admin"].includes(r.role));
    ensure(canView, "Role cannot list class members");

    const classId = profile.class_id;
    ensure(!!classId, "No class context available");

    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, avatar_url, class_id, university_id")
      .eq("class_id", classId);
    if (error) throw error;
    res.json(data);
  }),
);

profilesRouter.get(
  "/profiles/:id",
  validateParams(idParamSchema),
  asyncHandler(async (req, res) => {
    const auth = requireAuthContext(req);
    const targetId = req.params.id;

    const { data: target, error } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, avatar_url, class_id, university_id")
      .eq("id", targetId)
      .single();
    if (error) throw error;

    const isSelf = auth.userId === target.id;
    const isSuperAdmin = auth.roles.some((r) => r.role === "platform_admin");
    const isUniversityAdmin = auth.roles.some(
      (r) => r.role === "university_admin" && r.university_id === target.university_id,
    );
    const isClassScoped = auth.roles.some(
      (r) => ["class_representative", "student"].includes(r.role) && r.class_id === target.class_id,
    );

    ensure(isSelf || isSuperAdmin || isUniversityAdmin || isClassScoped, "Cannot view this profile");
    res.json(target);
  }),
);
