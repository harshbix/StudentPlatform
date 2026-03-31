import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth";
import { asyncHandler } from "../../lib/async-handler";
import { validateBody } from "../../middleware/validate";
import { supabaseAdmin } from "../../config/supabase";
import { ensure, hasRoleInUniversity } from "../../middleware/require-scope";
import { requireAuthContext } from "../../utils/auth-context";

const assignRoleSchema = z.object({
  user_id: z.string().uuid(),
  role: z.enum(["platform_admin", "university_admin", "student_organisation", "class_representative", "student"]),
  university_id: z.string().uuid().nullable().optional(),
  class_id: z.string().uuid().nullable().optional(),
});

export const rolesRouter = Router();
rolesRouter.use(requireAuth);

rolesRouter.get(
  "/roles/context",
  asyncHandler(async (req, res) => {
    const auth = requireAuthContext(req);
    res.json({ user_id: auth.userId, profile: auth.profile ?? null, roles: auth.roles });
  }),
);

rolesRouter.post(
  "/roles/assign",
  validateBody(assignRoleSchema),
  asyncHandler(async (req, res) => {
    const auth = requireAuthContext(req);
    const { user_id, role, university_id = null, class_id = null } = req.body;

    if (role === "platform_admin") {
      ensure(auth.roles.some((r) => r.role === "platform_admin"), "Only super admin can assign super admin role");
    } else {
      ensure(!!university_id, "university_id is required for this role");
      const canAssign = hasRoleInUniversity(auth.roles, ["platform_admin", "university_admin"], university_id);
      ensure(canAssign, "Cannot assign role in this university");

      if (role === "university_admin" || role === "student_organisation") {
        ensure(auth.roles.some((r) => r.role === "platform_admin"), "Only super admin can assign university-level web roles");
      }
      if (role === "class_representative" || role === "student") ensure(!!class_id, "class_id is required for class scoped role");
    }

    const { data, error } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id, role, university_id, class_id })
      .select("*")
      .single();
    if (error) throw error;

    res.status(201).json(data);
  }),
);
