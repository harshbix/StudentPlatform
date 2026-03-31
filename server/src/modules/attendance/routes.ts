import { Router } from "express";
import { asyncHandler } from "../../lib/async-handler";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth";
import { validateBody, validateParams } from "../../middleware/validate";
import { closeSessionSchema, createSessionSchema, idParam, markAttendanceSchema } from "./schemas";
import { requireAuthContext, requireProfile } from "../../utils/auth-context";
import { ensure, hasRoleInClass } from "../../middleware/require-scope";
import { supabaseAdmin } from "../../config/supabase";
import { conflict } from "../../utils/errors";
import { addStreakActivity } from "../../utils/streak";

export const attendanceRouter = Router();
attendanceRouter.use(requireAuth);

attendanceRouter.post(
  "/attendance/sessions",
  validateBody(createSessionSchema),
  asyncHandler(async (req, res) => {
    const auth = requireAuthContext(req);
    ensure(hasRoleInClass(auth.roles, ["class_rep", "super_admin"], req.body.class_id), "Cannot start session for this class");

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

    const { data: members } = await supabaseAdmin.from("profiles").select("id").eq("class_id", req.body.class_id);
    if (members?.length) {
      await supabaseAdmin.from("notifications").insert(
        members.map((m) => ({
          user_id: m.id,
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
  validateBody(markAttendanceSchema),
  asyncHandler(async (req, res) => {
    const auth = requireAuthContext(req);
    const profile = requireProfile(req);
    ensure(auth.roles.some((r) => r.role === "student"), "Only students can self-mark attendance");

    const { data: session, error: e1 } = await supabaseAdmin
      .from("attendance_sessions")
      .select("*")
      .eq("id", req.body.session_id)
      .single();
    if (e1) throw e1;

    const now = new Date();
    ensure(session.class_id === profile.class_id, "Cannot mark attendance for another class");
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
  validateParams(idParam),
  validateBody(
    z.object({
      status: z.enum(["present", "absent"]),
      verification_photo_url: z.string().url().optional(),
    }),
  ),
  asyncHandler(async (req, res) => {
    const auth = requireAuthContext(req);

    const { data: existing, error: e1 } = await supabaseAdmin
      .from("attendance_records")
      .select("id, session_id, attendance_sessions!inner(class_id)")
      .eq("id", req.params.id)
      .single();
    if (e1) throw e1;

    const classId = (Array.isArray(existing.attendance_sessions)
      ? existing.attendance_sessions[0]?.class_id
      : (existing.attendance_sessions as { class_id: string }).class_id) as string;
    ensure(hasRoleInClass(auth.roles, ["class_rep", "super_admin"], classId), "Cannot update attendance for this class");

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
  validateParams(idParam),
  validateBody(closeSessionSchema),
  asyncHandler(async (req, res) => {
    const auth = requireAuthContext(req);

    const { data: session, error: e1 } = await supabaseAdmin
      .from("attendance_sessions")
      .select("id,class_id")
      .eq("id", req.params.id)
      .single();
    if (e1) throw e1;

    ensure(hasRoleInClass(auth.roles, ["class_rep", "super_admin"], session.class_id), "Cannot close this session");

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
