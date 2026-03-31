import { Router } from "express";
import { asyncHandler } from "../../lib/async-handler";
import { requireAuth } from "../../middleware/auth";
import { validateBody, validateParams } from "../../middleware/validate";
import { createTaskSchema, idParam, updateTaskSchema } from "./schemas";
import { supabaseAdmin } from "../../config/supabase";
import { ensure, hasRoleInClass } from "../../middleware/require-scope";
import { requireAuthContext, requireProfile } from "../../utils/auth-context";

export const tasksRouter = Router();
tasksRouter.use(requireAuth);

tasksRouter.post(
  "/tasks",
  validateBody(createTaskSchema),
  asyncHandler(async (req, res) => {
    const auth = requireAuthContext(req);
    ensure(hasRoleInClass(auth.roles, ["class_rep", "super_admin"], req.body.class_id), "Cannot create task for this class");

    const payload = { ...req.body, created_by: auth.userId };
    const { data, error } = await supabaseAdmin.from("tasks").insert(payload).select("*").single();
    if (error) throw error;

    const { data: members } = await supabaseAdmin.from("profiles").select("id").eq("class_id", req.body.class_id);
    if (members?.length) {
      await supabaseAdmin.from("notifications").insert(
        members.map((m) => ({
          user_id: m.id,
          type: "task_published",
          title: "New task published",
          body: req.body.title,
          data: { class_id: req.body.class_id, task_id: data.id },
        })),
      );
    }

    res.status(201).json(data);
  }),
);

tasksRouter.patch(
  "/tasks/:id",
  validateParams(idParam),
  validateBody(updateTaskSchema),
  asyncHandler(async (req, res) => {
    const auth = requireAuthContext(req);
    const { data: existing, error: e1 } = await supabaseAdmin.from("tasks").select("id,class_id").eq("id", req.params.id).single();
    if (e1) throw e1;
    ensure(hasRoleInClass(auth.roles, ["class_rep", "super_admin"], existing.class_id), "Cannot edit this task");

    const { data, error } = await supabaseAdmin.from("tasks").update(req.body).eq("id", req.params.id).select("*").single();
    if (error) throw error;
    res.json(data);
  }),
);

tasksRouter.delete(
  "/tasks/:id",
  validateParams(idParam),
  asyncHandler(async (req, res) => {
    const auth = requireAuthContext(req);
    const { data: existing, error: e1 } = await supabaseAdmin.from("tasks").select("id,class_id").eq("id", req.params.id).single();
    if (e1) throw e1;
    ensure(hasRoleInClass(auth.roles, ["class_rep", "super_admin"], existing.class_id), "Cannot delete this task");

    const { error } = await supabaseAdmin.from("tasks").delete().eq("id", req.params.id);
    if (error) throw error;
    res.status(204).send();
  }),
);

tasksRouter.get(
  "/tasks",
  asyncHandler(async (req, res) => {
    const auth = requireAuthContext(req);
    const profile = requireProfile(req);

    if (auth.roles.some((r) => r.role === "student")) {
      const { data, error } = await supabaseAdmin
        .from("tasks")
        .select("*")
        .eq("class_id", profile.class_id)
        .order("due_at", { ascending: true });
      if (error) throw error;
      return res.json(data);
    }

    if (auth.roles.some((r) => r.role === "class_rep")) {
      const classIds = auth.roles.filter((r) => r.role === "class_rep").map((r) => r.class_id).filter(Boolean);
      const { data, error } = await supabaseAdmin.from("tasks").select("*").in("class_id", classIds as string[]);
      if (error) throw error;
      return res.json(data);
    }

    return res.json([]);
  }),
);

tasksRouter.get(
  "/tasks/:id",
  validateParams(idParam),
  asyncHandler(async (req, res) => {
    const auth = requireAuthContext(req);
    const profile = requireProfile(req);

    const { data, error } = await supabaseAdmin.from("tasks").select("*").eq("id", req.params.id).single();
    if (error) throw error;

    const isClassRep = hasRoleInClass(auth.roles, ["class_rep", "super_admin"], data.class_id);
    const isStudentInClass = auth.roles.some((r) => r.role === "student") && profile.class_id === data.class_id;
    ensure(isClassRep || isStudentInClass, "Cannot access this task");

    res.json(data);
  }),
);
