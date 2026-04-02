import { Router } from "express";
import { asyncHandler } from "../../lib/async-handler";
import { requireAuth } from "../../middleware/auth";
import { requireRole, requireResourceAccess } from "../../middleware/auth-pipeline";
import { validateBody, validateParams, validateQuery } from "../../middleware/validate";       
import { createSubmissionSchema, idParam, reviewSubmissionSchema, paginationSchema } from "./schemas";
import { supabaseAdmin } from "../../config/supabase";
import { ensure } from "../../middleware/require-scope";        
import { requireAuthContext, requireProfile } from "../../utils/auth-context";  
import { conflict, forbidden } from "../../utils/errors";
import { addStreakActivity } from "../../utils/streak";

export const submissionsRouter = Router();
submissionsRouter.use(requireAuth);

// 1. CREATE SUBMISSION
submissionsRouter.post(
  "/submissions",
  requireRole(["student", "platform_admin"]),
  validateBody(createSubmissionSchema),
  // We use requireResourceAccess to lookup the task they're uploading to, enforcing class boundary and retrieving the entity without double-querying it inside.
  requireResourceAccess("tasks", { classColumn: "class_id", paramKey: "task_id" }),
  asyncHandler(async (req, res) => {
    const auth = requireAuthContext(req);
    const task = req.resource;

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

// 2. LIST SUBMISSIONS FOR TASK
submissionsRouter.get(
  "/submissions/task/:id",
  requireRole(["student", "class_representative", "platform_admin"]),
  validateParams(idParam),
  validateQuery(paginationSchema),
  requireResourceAccess("tasks", { classColumn: "class_id" }),
  asyncHandler(async (req, res) => {
    const auth = requireAuthContext(req);
    const taskId = req.params.id;
    const { limit, offset } = req.query as any;

    let query = supabaseAdmin
      .from("submissions")
      .select("*", { count: "exact" })
      .eq("task_id", taskId)
      .order("submitted_at", { ascending: false })
      .range(offset, offset + limit - 1);

    // Students can only see their own submissions in a list
    const isOnlyStudent = auth.roles.every((r) => r.role === "student");
    if (isOnlyStudent) {
      query = query.eq("student_id", auth.userId);
    }

    const { data, error, count } = await query;
      
    if (error) throw error;
    res.json({ data, meta: { total: count || 0, limit, offset } });
  }),
);

// 3. GET SINGLE SUBMISSION
submissionsRouter.get(
  "/submissions/:id",
  requireRole(["student", "class_representative", "platform_admin"]),
  validateParams(idParam),
  requireResourceAccess("submissions", { 
    ownerColumn: "student_id", 
    classColumn: "tasks.class_id",
    selectQuery: "*, tasks!inner(class_id)" 
  }),
  asyncHandler(async (req, res) => {
    const auth = requireAuthContext(req);
    const isOnlyStudent = auth.roles.every((r) => r.role === "student");
    
    if (isOnlyStudent && req.resource.student_id !== auth.userId) {
      throw forbidden("Cannot access other student submission");
    }

    // req.resource is injected by requireResourceAccess and boundary-checked
    res.json(req.resource);
  }),
);

// 4. REVIEW SUBMISSION
submissionsRouter.patch(
  "/submissions/:id/review",
  requireRole(["class_representative", "platform_admin"]),
  validateParams(idParam),
  validateBody(reviewSubmissionSchema),
  requireResourceAccess("submissions", { 
    classColumn: "tasks.class_id",
    selectQuery: "*, tasks!inner(class_id)" 
  }),
  asyncHandler(async (req, res) => {
    const auth = requireAuthContext(req);
    const existing = req.resource;

    if (existing.status !== "submitted") {
      throw conflict("Submission has already been reviewed");
    }

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
