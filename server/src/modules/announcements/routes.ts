import { Router } from "express";
import { asyncHandler } from "../../lib/async-handler";
import { requireAuth } from "../../middleware/auth";
import { requireRole, requireScope, requireResourceAccess } from "../../middleware/auth-pipeline";
import { validateBody, validateParams, validateQuery } from "../../middleware/validate";
import { createAnnouncementSchema, idParam, paginationSchema } from "./schemas";
import { requireAuthContext, requireProfile } from "../../utils/auth-context";
import { ensure } from "../../middleware/require-scope";
import { supabaseAdmin } from "../../config/supabase";

export const announcementsRouter = Router();
announcementsRouter.use(requireAuth);

announcementsRouter.post(
  "/announcements",
  requireRole(["class_representative", "university_admin", "student_organisation", "platform_admin"]),
  validateBody(createAnnouncementSchema),
  requireScope("university", "university_id"),
  asyncHandler(async (req, res) => {
    const auth = requireAuthContext(req);
    const scope = req.body.scope;

    const isPlatformAdmin = auth.roles.some((r) => r.role === "platform_admin");
    const isUniversityAdmin = isPlatformAdmin || auth.roles.some((r) => r.role === "university_admin" && r.university_id === req.body.university_id);
    const isStudentOrg = auth.roles.some((r) => r.role === "student_organisation" && r.university_id === req.body.university_id);
    const isClassRepresentative = auth.roles.some((r) => r.role === "class_representative" && r.class_id === req.body.class_id);

    if (!isPlatformAdmin) {
      if (isClassRepresentative) {
        ensure(scope === "class", "Class Rep can only publish class announcements");
      } else if (isUniversityAdmin) {
        ensure(["class", "department", "university"].includes(scope), "Invalid scope for university admin");
      } else if (isStudentOrg) {
        ensure(scope !== "class", "Student Organisation cannot publish class operational announcements");
      } else {
        ensure(false, "Role cannot publish announcements in this scope");
      }
    }

    const payload = { ...req.body, created_by: auth.userId };
    const { data, error } = await supabaseAdmin.from("announcements").insert(payload).select("*").single();
    if (error) throw error;

    let recipientQuery = supabaseAdmin
      .from("user_roles")
      .select("user_id")
      .eq("university_id", req.body.university_id);

    if (scope === "class" && req.body.class_id) {
      recipientQuery = recipientQuery.eq("class_id", req.body.class_id);
    }

    const { data: recipients } = await recipientQuery;
    if (recipients?.length) {
      // Deduplicate recipients
      const uniqueRecipients = [...new Set(recipients.map(r => r.user_id))];
      await supabaseAdmin.from("notifications").insert(
        uniqueRecipients.map((user_id) => ({
          user_id,
          type: "announcement_published",
          title: req.body.title,
          body: req.body.body,
          data: { announcement_id: data.id, scope: req.body.scope },
        })),
      );
    }

    res.status(201).json(data);
  }),
);

announcementsRouter.get(
  "/announcements/relevant",
  requireRole(["student", "class_representative", "university_admin", "student_organisation", "platform_admin"]),
  requireScope("university"),
  validateQuery(paginationSchema),
  asyncHandler(async (req, res) => {
    const auth = requireAuthContext(req);
    const profile = requireProfile(req);
    const { limit, offset } = req.query as any;

    ensure(!!profile.university_id, "Profile missing university scope");

    const query = supabaseAdmin
      .from("announcements")
      .select("*", { count: "exact" })
      .eq("university_id", profile.university_id)
      .or(
        `scope.eq.university,` +
          `and(scope.eq.department,department_id.not.is.null),` + // Actually auth.user's department should be used if added later
          `and(scope.eq.class,class_id.eq.${profile.class_id ?? "00000000-0000-0000-0000-000000000000"})`,
      )
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    const { data, error, count } = await query;
    if (error) throw error;
    res.json({ data, meta: { total: count || 0, limit, offset } });
  }),
);

announcementsRouter.get(
  "/announcements/:id",
  requireRole(["student", "class_representative", "university_admin", "student_organisation", "platform_admin"]),
  validateParams(idParam),
  requireResourceAccess("announcements", { universityColumn: "university_id" }),
  asyncHandler(async (req, res) => {
    // req.resource is boundary checked
    res.json(req.resource);
  }),
);
