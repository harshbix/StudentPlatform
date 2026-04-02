import { Router } from "express";
import { asyncHandler } from "../../lib/async-handler";
import { requireAuth } from "../../middleware/auth";
import { requireRole, requireScope, requireResourceAccess } from "../../middleware/auth-pipeline";
import { validateBody, validateParams, validateQuery } from "../../middleware/validate";       
import { createTaskSchema, idParam, updateTaskSchema, paginationSchema } from "./schemas";        
import { supabaseAdmin } from "../../config/supabase";
import { requireAuthContext } from "../../utils/auth-context";  

export const tasksRouter = Router();
tasksRouter.use(requireAuth);

tasksRouter.post(
  "/tasks",
  requireRole(["class_representative", "platform_admin"]),
  validateBody(createTaskSchema),
  requireScope("class", "class_id"),
  asyncHandler(async (req, res) => {
    const auth = requireAuthContext(req);
    const payload = { ...req.body, created_by: auth.userId };
    
    const { data, error } = await supabaseAdmin.from("tasks").insert(payload).select("*").single();
    if (error) throw error;

    const { data: members } = await supabaseAdmin.from("user_roles").select("user_id").eq("class_id", req.body.class_id).eq("role", "student");
    if (members?.length) {
      await supabaseAdmin.from("notifications").insert(
        members.map((m) => ({
          user_id: m.user_id,
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
  requireRole(["class_representative", "platform_admin"]),
  validateParams(idParam),
  validateBody(updateTaskSchema),
  requireResourceAccess("tasks", { classColumn: "class_id" }),
  asyncHandler(async (req, res) => {
    // req.resource is boundaries checked automatically
    const { data, error } = await supabaseAdmin.from("tasks").update(req.body).eq("id", req.params.id).select("*").single();
    if (error) throw error;
    res.json(data);
  }),
);

tasksRouter.delete(
  "/tasks/:id",
  requireRole(["class_representative", "platform_admin"]),
  validateParams(idParam),
  requireResourceAccess("tasks", { classColumn: "class_id" }),
  asyncHandler(async (req, res) => {
    // boundary checked
    const { error } = await supabaseAdmin.from("tasks").delete().eq("id", req.params.id);
    if (error) throw error;
    res.status(204).send();
  }),
);

tasksRouter.get(
  "/tasks",
  requireRole(["student", "class_representative", "platform_admin"]),
  requireScope("class"),
  validateQuery(paginationSchema),
  asyncHandler(async (req, res) => {
    const auth = requireAuthContext(req);
    const { limit, offset } = req.query as any;

    let query = supabaseAdmin
        .from("tasks")
        .select("*", { count: "exact" })
        .order("due_at", { ascending: true })
        .range(offset, offset + limit - 1);

    if (auth.roles.some((r) => r.role === "platform_admin")) {
        // Platform Admins see all by default, or specific scoped
    } else if (auth.roles.some((r) => r.role === "student" || r.role === "class_representative")) {
        // Fetch tasks scoped exactly to their class_ids from user_roles
        const classIds = auth.roles.map((r) => r.class_id).filter(Boolean);
        query = query.in("class_id", classIds as string[]);
    }

    const { data, error, count } = await query;
    if (error) throw error;
    res.json({ data, meta: { total: count || 0, limit, offset } });
  }),
);

tasksRouter.get(
  "/tasks/:id",
  requireRole(["student", "class_representative", "platform_admin"]),
  validateParams(idParam),
  requireResourceAccess("tasks", { classColumn: "class_id" }),
  asyncHandler(async (req, res) => {
    // req.resource is boundary checked
    res.json(req.resource);
  })
);
