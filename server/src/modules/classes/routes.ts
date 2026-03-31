import { Router } from "express";
import { asyncHandler } from "../../lib/async-handler";
import { requireAuth } from "../../middleware/auth";
import { validateBody, validateParams } from "../../middleware/validate";
import {
  assignClassRepSchema,
  assignStudentSchema,
  classIdParam,
  createClassSchema,
  updateClassSchema,
} from "./schemas";
import { supabaseAdmin } from "../../config/supabase";
import { ensure, hasRoleInUniversity } from "../../middleware/require-scope";
import { requireAuthContext } from "../../utils/auth-context";

export const classesRouter = Router();
classesRouter.use(requireAuth);

classesRouter.post(
  "/classes",
  validateBody(createClassSchema),
  asyncHandler(async (req, res) => {
    const auth = requireAuthContext(req);
    const allowed = hasRoleInUniversity(auth.roles, ["super_admin", "university_admin"], req.body.university_id);
    ensure(allowed, "Cannot create class in this university");

    const payload = { ...req.body, created_by: auth.userId };
    const { data, error } = await supabaseAdmin.from("classes").insert(payload).select("*").single();
    if (error) throw error;
    res.status(201).json(data);
  }),
);

classesRouter.patch(
  "/classes/:id",
  validateParams(classIdParam),
  validateBody(updateClassSchema),
  asyncHandler(async (req, res) => {
    const auth = requireAuthContext(req);
    const { data: existing, error: e1 } = await supabaseAdmin
      .from("classes")
      .select("id, university_id")
      .eq("id", req.params.id)
      .single();
    if (e1) throw e1;

    const allowed = hasRoleInUniversity(auth.roles, ["super_admin", "university_admin"], existing.university_id);
    ensure(allowed, "Cannot update this class");

    const { data, error } = await supabaseAdmin
      .from("classes")
      .update(req.body)
      .eq("id", req.params.id)
      .select("*")
      .single();
    if (error) throw error;
    res.json(data);
  }),
);

classesRouter.post(
  "/classes/assign-student",
  validateBody(assignStudentSchema),
  asyncHandler(async (req, res) => {
    const auth = requireAuthContext(req);
    const { class_id, student_id } = req.body;

    const { data: cls, error: e1 } = await supabaseAdmin
      .from("classes")
      .select("id, university_id")
      .eq("id", class_id)
      .single();
    if (e1) throw e1;

    const allowed = hasRoleInUniversity(auth.roles, ["super_admin", "university_admin"], cls.university_id);
    ensure(allowed, "Cannot assign student to this class");

    const { data, error } = await supabaseAdmin
      .from("profiles")
      .update({ class_id, university_id: cls.university_id })
      .eq("id", student_id)
      .select("id, class_id, university_id")
      .single();
    if (error) throw error;

    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: student_id, role: "student", university_id: cls.university_id, class_id });
    if (roleError && (roleError as { code?: string }).code !== "23505") throw roleError;

    res.json(data);
  }),
);

classesRouter.post(
  "/classes/assign-class-rep",
  validateBody(assignClassRepSchema),
  asyncHandler(async (req, res) => {
    const auth = requireAuthContext(req);
    const { class_id, user_id } = req.body;

    const { data: cls, error: e1 } = await supabaseAdmin
      .from("classes")
      .select("id, university_id")
      .eq("id", class_id)
      .single();
    if (e1) throw e1;

    const allowed = hasRoleInUniversity(auth.roles, ["super_admin", "university_admin"], cls.university_id);
    ensure(allowed, "Cannot assign class rep for this class");

    const { data: approvedRequest, error: reqErr } = await supabaseAdmin
      .from("class_rep_requests")
      .select("id")
      .eq("requester_id", user_id)
      .eq("class_id", class_id)
      .eq("university_id", cls.university_id)
      .eq("status", "approved")
      .maybeSingle();
    if (reqErr) throw reqErr;
    ensure(!!approvedRequest, "Class Rep assignment requires an approved request");

    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id, role: "class_rep", university_id: cls.university_id, class_id });
    if (roleError && (roleError as { code?: string }).code !== "23505") throw roleError;

    const { data, error } = await supabaseAdmin
      .from("profiles")
      .update({ class_id, university_id: cls.university_id })
      .eq("id", user_id)
      .select("id, class_id, university_id")
      .single();
    if (error) throw error;

    res.json(data);
  }),
);
