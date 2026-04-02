import { Router } from "express";
import { asyncHandler } from "../../lib/async-handler";
import { requireAuth } from "../../middleware/auth";
import { requireRole, requireScope, requireResourceAccess } from "../../middleware/auth-pipeline";
import { validateBody, validateParams, validateQuery } from "../../middleware/validate";
import { supabaseAdmin } from "../../config/supabase";
import { requireAuthContext, requireProfile } from "../../utils/auth-context";
import { ensure } from "../../middleware/require-scope";
import { idParamSchema, updateOwnProfileSchema, paginationSchema } from "./schemas";

export const profilesRouter = Router();
profilesRouter.use(requireAuth);

profilesRouter.get(
  "/profiles/me",
  requireRole(["student", "class_representative", "university_admin", "student_organisation", "platform_admin", "guest"]),
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
  requireRole(["student", "class_representative", "university_admin", "student_organisation", "platform_admin", "guest"]),
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
  requireRole(["student", "class_representative", "university_admin", "platform_admin"]),
  requireScope("class"),
  validateQuery(paginationSchema),
  asyncHandler(async (req, res) => {
    const profile = requireProfile(req);
    const classId = profile.class_id;
    ensure(!!classId, "No class context available");
    const { limit, offset } = req.query as any;

    const { data, error, count } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, avatar_url, class_id, university_id", { count: "exact" })
      .eq("class_id", classId)
      .range(offset, offset + limit - 1);
      
    if (error) throw error;
    res.json({ data, meta: { total: count || 0, limit, offset } });
  }),
);

profilesRouter.get(
  "/profiles/:id",
  requireRole(["student", "class_representative", "university_admin", "platform_admin"]),
  validateParams(idParamSchema),
  requireResourceAccess("profiles", { ownerColumn: "id", universityColumn: "university_id", classColumn: "class_id" }),
  asyncHandler(async (req, res) => {
    const auth = requireAuthContext(req);
    const target = req.resource;

    const isSelf = auth.userId === target.id;
    const isPlatformAdmin = auth.roles.some((r) => r.role === "platform_admin");
    const isUniversityAdmin = auth.roles.some((r) => r.role === "university_admin" && r.university_id === target.university_id);
    const isClassScoped = auth.roles.some((r) => ["class_representative", "student"].includes(r.role) && r.class_id === target.class_id);

    ensure(isSelf || isPlatformAdmin || isUniversityAdmin || isClassScoped, "Cannot view this profile");
    res.json(target);
  }),
);
