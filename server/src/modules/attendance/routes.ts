import { Router } from "express";
import { asyncHandler } from "../../lib/async-handler";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth";
import { requireRole, requireScope, requireResourceAccess } from "../../middleware/auth-pipeline";
import { validateBody, validateParams } from "../../middleware/validate";       
import { closeSessionSchema, createSessionSchema, idParam, markAttendanceSchema } from "./schemas";
import { requireAuthContext } from "../../utils/auth-context";  
import { ensure } from "../../middleware/require-scope";        
import { supabaseAdmin } from "../../config/supabase";
import { conflict } from "../../utils/errors";
import { addStreakActivity } from "../../utils/streak";

export const attendanceRouter = Router();
attendanceRouter.use(requireAuth);

attendanceRouter.post(
  "/attendance/sessions",
  requireRole(["class_representative", "platform_admin"]),
  validateBody(createSessionSchema),
  requireScope("class", "class_id"),
  asyncHandler(async (req, res) => {
    const auth = requireAuthContext(req);

    const payload = {
      class_id: req.body.class_id,
      started_by: auth.userId,
      starts_at: req.body.starts_at,
      ends_at: req.body.ends_at,
      status: "active",
      suspicious: req.body.suspicious,
      suspicion_reason: req.body.suspicion_reason ?? null,
      verification_photo_url: req.body.verification_photo_url ?? null,
    };

    const { data, error } = await supabaseAdmin.from("attendance_sessions").insert(payload).select("*").single();
    if (error) throw error;

    const { data: members } = await supabaseAdmin.from("user_roles").select("user_id").eq("class_id", req.body.class_id).eq("role", "student");
    if (members?.length) {
      await supabaseAdmin.from("notifications").insert(
        members.map((m) => ({
          user_id: m.user_id,
          type: "attendance_session_started",
          title: "Attendance session started",
          body: "Mark your attendance within the active window",
          data: { session_id: data.id, class_id: req.body.class_id },
        })),
      );
    }

    res.status(201).json(data);
  }),
);

attendanceRouter.post(
  "/attendance/records",
  requireRole(["student", "platform_admin"]),
  validateBody(markAttendanceSchema),
  requireResourceAccess("attendance_sessions", { classColumn: "class_id", paramKey: "session_id" }),
  asyncHandler(async (req, res) => {
    const auth = requireAuthContext(req);
    const session = req.resource;

    const now = new Date();
    ensure(session.status === "active", "Attendance session is not active");    
    ensure(new Date(session.starts_at) <= now && now <= new Date(session.ends_at), "Outside attendance window");

    const payload = {
      session_id: req.body.session_id,
      student_id: auth.userId,
      status: "present",
      verification_photo_url: req.body.verification_photo_url ?? null,
    };

    const { data, error } = await supabaseAdmin.from("attendance_records").insert(payload).select("*").single();
    if (error) {
      if ((error as { code?: string }).code === "23505") throw conflict("Attendance already marked for this session");
      throw error;
    }

    await supabaseAdmin.from("xp_events").insert({
      user_id: auth.userId,
      source: "attendance_mark",
      points: 5,
      source_ref_id: data.id,
    });

    const { data: current } = await supabaseAdmin.from("profiles").select("xp").eq("id", auth.userId).single();
    await supabaseAdmin.from("profiles").update({ xp: (current?.xp ?? 0) + 5 }).eq("id", auth.userId);
    await addStreakActivity(auth.userId, "attendance_mark");

    res.status(201).json(data);
  }),
);

attendanceRouter.patch(
  "/attendance/records/:id",
  requireRole(["class_representative", "platform_admin"]),
  validateParams(idParam),
  validateBody(
    z.object({
      status: z.enum(["present", "absent"]),
      verification_photo_url: z.string().url().optional(),
    }),
  ),
  requireResourceAccess("attendance_records", {
    classColumn: "attendance_sessions.class_id",
    selectQuery: "*, attendance_sessions!inner(class_id)"
  }),
  asyncHandler(async (req, res) => {
    const existing = req.resource;

    const payload = {
      status: req.body.status,
      verification_photo_url: req.body.verification_photo_url ?? null,
    };

    const { data, error } = await supabaseAdmin
      .from("attendance_records")
      .update(payload)
      .eq("id", req.params.id)
      .select("*")
      .single();
    if (error) throw error;

    res.json(data);
  }),
);

attendanceRouter.patch(
  "/attendance/sessions/:id/close",
  requireRole(["class_representative", "platform_admin"]),
  validateParams(idParam),
  validateBody(closeSessionSchema),
  requireResourceAccess("attendance_sessions", { classColumn: "class_id" }),
  asyncHandler(async (req, res) => {
    const payload = {
      status: req.body.status,
      suspicious: req.body.suspicious ?? req.body.status === "flagged",
      suspicion_reason: req.body.suspicion_reason ?? null,
      verification_photo_url: req.body.verification_photo_url ?? null,
    };

    const { data, error } = await supabaseAdmin
      .from("attendance_sessions")
      .update(payload)
      .eq("id", req.params.id)
      .select("*")
      .single();
    if (error) throw error;

    res.json(data);
  }),
);
