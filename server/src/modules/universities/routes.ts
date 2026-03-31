import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { asyncHandler } from "../../lib/async-handler";
import { validateBody, validateParams } from "../../middleware/validate";
import { universityCreateSchema, universityIdParam, universityUpdateSchema } from "./schemas";
import { supabaseAdmin } from "../../config/supabase";
import { ensure } from "../../middleware/require-scope";
import { requireAuthContext, requireProfile } from "../../utils/auth-context";

export const universitiesRouter = Router();
universitiesRouter.use(requireAuth);

universitiesRouter.post(
  "/universities",
  validateBody(universityCreateSchema),
  asyncHandler(async (req, res) => {
    const auth = requireAuthContext(req);
    ensure(auth.roles.some((r) => r.role === "super_admin"), "Only super admin can create universities");

    const { data, error } = await supabaseAdmin.from("universities").insert(req.body).select("*").single();
    if (error) throw error;
    res.status(201).json(data);
  }),
);

universitiesRouter.get(
  "/universities",
  asyncHandler(async (req, res) => {
    const auth = requireAuthContext(req);
    if (auth.roles.some((r) => r.role === "super_admin")) {
      const { data, error } = await supabaseAdmin.from("universities").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return res.json(data);
    }

    const profile = requireProfile(req);
    const { data, error } = await supabaseAdmin.from("universities").select("*").eq("id", profile.university_id).single();
    if (error) throw error;
    return res.json([data]);
  }),
);

universitiesRouter.get(
  "/universities/:id",
  validateParams(universityIdParam),
  asyncHandler(async (req, res) => {
    const auth = requireAuthContext(req);
    const id = req.params.id;
    const allowed = auth.roles.some(
      (r) => r.role === "super_admin" || (r.role === "university_admin" && r.university_id === id),
    );
    ensure(allowed, "Cannot access this university");

    const { data, error } = await supabaseAdmin.from("universities").select("*").eq("id", id).single();
    if (error) throw error;
    res.json(data);
  }),
);

universitiesRouter.patch(
  "/universities/:id",
  validateParams(universityIdParam),
  validateBody(universityUpdateSchema),
  asyncHandler(async (req, res) => {
    const auth = requireAuthContext(req);
    ensure(auth.roles.some((r) => r.role === "super_admin"), "Only super admin can update universities");

    const { data, error } = await supabaseAdmin
      .from("universities")
      .update(req.body)
      .eq("id", req.params.id)
      .select("*")
      .single();
    if (error) throw error;
    res.json(data);
  }),
);
