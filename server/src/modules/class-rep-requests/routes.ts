import { Router } from "express";
import { asyncHandler } from "../../lib/async-handler";
import { requireAuth } from "../../middleware/auth";
import { validateBody, validateParams } from "../../middleware/validate";
import { createRequestSchema, idParam, reviewRequestSchema } from "./schemas";
import { requireAuthContext, requireProfile } from "../../utils/auth-context";
import { ensure, hasRoleInUniversity } from "../../middleware/require-scope";
import { supabaseAdmin } from "../../config/supabase";
import { conflict } from "../../utils/errors";

export const classRepRequestsRouter = Router();
classRepRequestsRouter.use(requireAuth);

classRepRequestsRouter.post(
  "/class-rep-requests",
  validateBody(createRequestSchema),
  asyncHandler(async (req, res) => {
    const auth = requireAuthContext(req);
    const profile = requireProfile(req);

    ensure(auth.roles.some((r) => r.role === "student"), "Only students can request class rep role");

    const { class_id, request_reason } = req.body;
    ensure(profile.class_id === class_id, "Student can only request for own class");

    const { data: cls, error: clsErr } = await supabaseAdmin
      .from("classes")
      .select("id, university_id")
      .eq("id", class_id)
      .single();
    if (clsErr) throw clsErr;

    const { data, error } = await supabaseAdmin
      .from("class_rep_requests")
      .insert({
        requester_id: auth.userId,
        university_id: cls.university_id,
        class_id,
        request_reason: request_reason ?? null,
        status: "pending",
      })
      .select("*")
      .single();

    if (error) {
      if ((error as { code?: string }).code === "23505") throw conflict("A pending request already exists for this class");
      throw error;
    }

    await supabaseAdmin.from("notifications").insert({
      user_id: auth.userId,
      type: "class_rep_request_submitted",
      title: "Class Rep request submitted",
      body: "Your request is pending university admin review",
    });

    res.status(201).json(data);
  }),
);

classRepRequestsRouter.get(
  "/class-rep-requests/university/:id",
  validateParams(idParam),
  asyncHandler(async (req, res) => {
    const auth = requireAuthContext(req);
    const universityId = String(req.params.id);
    const allowed = hasRoleInUniversity(auth.roles, ["platform_admin", "university_admin"], universityId);
    ensure(allowed, "Cannot view requests for this university");

    const { data, error } = await supabaseAdmin
      .from("class_rep_requests")
      .select("*")
      .eq("university_id", universityId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    res.json(data);
  }),
);

classRepRequestsRouter.patch(
  "/class-rep-requests/:id/review",
  validateParams(idParam),
  validateBody(reviewRequestSchema),
  asyncHandler(async (req, res) => {
    const auth = requireAuthContext(req);
    const { id } = req.params;

    const { data: existing, error: e1 } = await supabaseAdmin
      .from("class_rep_requests")
      .select("*")
      .eq("id", id)
      .single();
    if (e1) throw e1;

    const allowed = hasRoleInUniversity(auth.roles, ["platform_admin", "university_admin"], existing.university_id);
    ensure(allowed, "Cannot review this request");

    const updatePayload = {
      status: req.body.status,
      reviewed_by: auth.userId,
      reviewed_at: new Date().toISOString(),
      rejection_reason: req.body.status === "rejected" ? req.body.rejection_reason ?? null : null,
    };

    const { data, error } = await supabaseAdmin
      .from("class_rep_requests")
      .update(updatePayload)
      .eq("id", id)
      .eq("status", "pending")
      .select("*")
      .single();
    if (error) throw error;

    if (data.status === "approved") {
      const { error: roleError } = await supabaseAdmin.from("user_roles").insert({
        user_id: data.requester_id,
        role: "class_representative",
        university_id: data.university_id,
        class_id: data.class_id,
      });
      if (roleError && (roleError as { code?: string }).code !== "23505") throw roleError;

      await supabaseAdmin.from("notifications").insert({
        user_id: data.requester_id,
        type: "class_rep_request_approved",
        title: "Class Rep request approved",
        body: "You now have class rep access for your class",
      });
    } else {
      await supabaseAdmin.from("notifications").insert({
        user_id: data.requester_id,
        type: "class_rep_request_rejected",
        title: "Class Rep request rejected",
        body: data.rejection_reason ?? "Your request was rejected",
      });
    }

    res.json(data);
  }),
);
