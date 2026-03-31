import { Router } from "express";
import { asyncHandler } from "../../lib/async-handler";
import { requireAuth } from "../../middleware/auth";
import { validateBody, validateParams } from "../../middleware/validate";
import { createDepartmentSchema, idParam, updateDepartmentSchema } from "./schemas";
import { supabaseAdmin } from "../../config/supabase";
import { ensure, hasRoleInUniversity } from "../../middleware/require-scope";
import { requireAuthContext } from "../../utils/auth-context";

export const departmentsRouter = Router();
departmentsRouter.use(requireAuth);

departmentsRouter.post(
  "/departments",
  validateBody(createDepartmentSchema),
  asyncHandler(async (req, res) => {
    const auth = requireAuthContext(req);
    const allowed = hasRoleInUniversity(auth.roles, ["super_admin", "university_admin"], req.body.university_id);
    ensure(allowed, "Cannot create department in this university");

    const { data, error } = await supabaseAdmin.from("departments").insert(req.body).select("*").single();
    if (error) throw error;
    res.status(201).json(data);
  }),
);

departmentsRouter.get(
  "/departments/university/:id",
  validateParams(idParam),
  asyncHandler(async (req, res) => {
    const auth = requireAuthContext(req);
    const universityId = String(req.params.id);
    const allowed = hasRoleInUniversity(auth.roles, ["super_admin", "university_admin"], universityId);
    ensure(allowed, "Cannot view departments for this university");

    const { data, error } = await supabaseAdmin
      .from("departments")
      .select("*")
      .eq("university_id", universityId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    res.json(data);
  }),
);

departmentsRouter.patch(
  "/departments/:id",
  validateParams(idParam),
  validateBody(updateDepartmentSchema),
  asyncHandler(async (req, res) => {
    const auth = requireAuthContext(req);
    const { data: existing, error: e1 } = await supabaseAdmin
      .from("departments")
      .select("id, university_id")
      .eq("id", req.params.id)
      .single();
    if (e1) throw e1;

    const allowed = hasRoleInUniversity(auth.roles, ["super_admin", "university_admin"], existing.university_id);
    ensure(allowed, "Cannot update this department");

    const { data, error } = await supabaseAdmin
      .from("departments")
      .update(req.body)
      .eq("id", req.params.id)
      .select("*")
      .single();

    if (error) throw error;
    res.json(data);
  }),
);
