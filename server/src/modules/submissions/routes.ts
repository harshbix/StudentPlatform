import { Router } from "express";
import { asyncHandler } from "../../lib/async-handler";
import { requireAuth } from "../../middleware/auth";
import { validateBody, validateParams } from "../../middleware/validate";
import { createSubmissionSchema, idParam, reviewSubmissionSchema } from "./schemas";
import { supabaseAdmin } from "../../config/supabase";
import { ensure, hasRoleInClass } from "../../middleware/require-scope";
import { requireAuthContext, requireProfile } from "../../utils/auth-context";
import { conflict } from "../../utils/errors";
import { addStreakActivity } from "../../utils/streak";

export const submissionsRouter = Router();
submissionsRouter.use(requireAuth);

submissionsRouter.post(
  "/submissions",
  validateBody(createSubmissionSchema),
  asyncHandler(async (req, res) => {
    const auth = requireAuthContext(req);
    const profile = requireProfile(req);
    ensure(auth.roles.some((r) => r.role === "student"), "Only students can submit tasks");

    const { data: task, error: taskErr } = await supabaseAdmin.from("tasks").select("id,class_id,due_at,status").eq("id", req.body.task_id).single();
    if (taskErr) throw taskErr;

    ensure(profile.class_id === task.class_id, "Cannot submit for another class task");
    ensure(task.status !== "closed", "Task is closed");

    const now = new Date();
    ensure(new Date(task.due_at) >= now, "Task deadline has passed");

    const payload = {
      task_id: req.body.task_id,
      student_id: auth.userId,
      text_response: req.body.text_response ?? null,
      file_url: req.body.file_url ?? null,
      status: "submitted",
    };

    const { data, error } = await supabaseAdmin.from("submissions").insert(payload).select("*").single();
    if (error) {
      if ((error as { code?: string }).code === "23505") throw conflict("Submission already exists for this task");
      throw error;
    }

    await supabaseAdmin.from("xp_events").insert({
      user_id: auth.userId,
      source: "task_submission",
      points: 10,
      source_ref_id: data.id,
    });

    const { data: current } = await supabaseAdmin.from("profiles").select("xp").eq("id", auth.userId).single();
    const nextXp = (current?.xp ?? 0) + 10;
    await supabaseAdmin.from("profiles").update({ xp: nextXp }).eq("id", auth.userId);
    await addStreakActivity(auth.userId, "task_submission");

    res.status(201).json(data);
  }),
);

submissionsRouter.get(
  "/submissions/task/:id",
  validateParams(idParam),
  asyncHandler(async (req, res) => {
    const auth = requireAuthContext(req);
    const taskId = req.params.id;

    const { data: task, error: e1 } = await supabaseAdmin.from("tasks").select("id,class_id").eq("id", taskId).single();
    if (e1) throw e1;
    ensure(hasRoleInClass(auth.roles, ["class_representative", "platform_admin"], task.class_id), "Cannot list submissions for this task");

    const { data, error } = await supabaseAdmin.from("submissions").select("*").eq("task_id", taskId).order("submitted_at", { ascending: false });
    if (error) throw error;
    res.json(data);
  }),
);

submissionsRouter.get(
  "/submissions/:id",
  validateParams(idParam),
  asyncHandler(async (req, res) => {
    const auth = requireAuthContext(req);
    const profile = requireProfile(req);

    const { data, error } = await supabaseAdmin.from("submissions").select("*, tasks!inner(class_id)").eq("id", req.params.id).single();
    if (error) throw error;

    const classId = data.tasks.class_id as string;
    const canRepView = hasRoleInClass(auth.roles, ["class_representative", "platform_admin"], classId);
    const canStudentView = auth.roles.some((r) => r.role === "student") && data.student_id === auth.userId && profile.class_id === classId;

    ensure(canRepView || canStudentView, "Cannot view this submission");
    res.json(data);
  }),
);

submissionsRouter.patch(
  "/submissions/:id/review",
  validateParams(idParam),
  validateBody(reviewSubmissionSchema),
  asyncHandler(async (req, res) => {
    const auth = requireAuthContext(req);

    const { data: existing, error: e1 } = await supabaseAdmin
      .from("submissions")
      .select("id, student_id, task_id, tasks!inner(class_id)")
      .eq("id", req.params.id)
      .single();
    if (e1) throw e1;

    const classId = (Array.isArray(existing.tasks)
      ? existing.tasks[0]?.class_id
      : (existing.tasks as { class_id: string }).class_id) as string;
    ensure(hasRoleInClass(auth.roles, ["class_representative", "platform_admin"], classId), "Cannot review submissions for this class");

    const payload = {
      status: req.body.status,
      feedback: req.body.feedback ?? null,
      reviewed_by: auth.userId,
      reviewed_at: new Date().toISOString(),
    };

    const { data, error } = await supabaseAdmin.from("submissions").update(payload).eq("id", req.params.id).select("*").single();
    if (error) throw error;

    await supabaseAdmin.from("notifications").insert({
      user_id: existing.student_id,
      type: req.body.status === "approved" ? "submission_approved" : "submission_rejected",
      title: req.body.status === "approved" ? "Submission approved" : "Submission rejected",
      body: req.body.feedback ?? null,
      data: { submission_id: req.params.id, task_id: existing.task_id },
    });

    res.json(data);
  }),
);
