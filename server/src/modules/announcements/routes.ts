import { Router } from "express";
import { asyncHandler } from "../../lib/async-handler";
import { requireAuth } from "../../middleware/auth";
import { validateBody, validateParams } from "../../middleware/validate";
import { createAnnouncementSchema, idParam } from "./schemas";
import { requireAuthContext, requireProfile } from "../../utils/auth-context";
import { ensure, hasRoleInUniversity } from "../../middleware/require-scope";
import { supabaseAdmin } from "../../config/supabase";

export const announcementsRouter = Router();
announcementsRouter.use(requireAuth);

announcementsRouter.post(
  "/announcements",
  validateBody(createAnnouncementSchema),
  asyncHandler(async (req, res) => {
    const auth = requireAuthContext(req);

    const payload = { ...req.body, created_by: auth.userId };
    const scope = req.body.scope;

    const isClassRep = auth.roles.some((r) => r.role === "class_rep");
    const isUniversityAdmin = hasRoleInUniversity(auth.roles, ["super_admin", "university_admin"], req.body.university_id);
    const isStudentOrg = hasRoleInUniversity(auth.roles, ["super_admin", "student_organisation"], req.body.university_id);

    if (isClassRep) {
      ensure(scope === "class", "Class Rep can only publish class announcements");
      const repClassIds = auth.roles.filter((r) => r.role === "class_rep").map((r) => r.class_id);
      ensure(repClassIds.includes(req.body.class_id), "Class Rep can only publish for own class");
    } else if (isUniversityAdmin) {
      ensure(["class", "department", "university"].includes(scope), "Invalid scope for university admin");
    } else if (isStudentOrg) {
      ensure(scope !== "class", "Student Organisation cannot publish class operational announcements");
    } else {
      ensure(false, "Role cannot publish announcements");
    }

    const { data, error } = await supabaseAdmin.from("announcements").insert(payload).select("*").single();
    if (error) throw error;

    let recipientQuery = supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("university_id", req.body.university_id);

    if (scope === "class" && req.body.class_id) {
      recipientQuery = recipientQuery.eq("class_id", req.body.class_id);
    }

    const { data: recipients } = await recipientQuery;
    if (recipients?.length) {
      await supabaseAdmin.from("notifications").insert(
        recipients.map((r) => ({
          user_id: r.id,
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
  asyncHandler(async (req, res) => {
    const auth = requireAuthContext(req);
    const profile = requireProfile(req);

    ensure(!!profile.university_id, "Profile missing university scope");

    const { data, error } = await supabaseAdmin
      .from("announcements")
      .select("*")
      .eq("university_id", profile.university_id)
      .or(
        `scope.eq.university,` +
          `and(scope.eq.department,department_id.not.is.null),` +
          `and(scope.eq.class,class_id.eq.${profile.class_id ?? "00000000-0000-0000-0000-000000000000"})`,
      )
      .order("created_at", { ascending: false });

    if (error) throw error;
    res.json(data);
  }),
);

announcementsRouter.get(
  "/announcements/:id",
  validateParams(idParam),
  asyncHandler(async (req, res) => {
    const auth = requireAuthContext(req);
    const profile = requireProfile(req);

    const { data, error } = await supabaseAdmin.from("announcements").select("*").eq("id", req.params.id).single();
    if (error) throw error;

    const sameUniversity = data.university_id === profile.university_id;
    const isSuperAdmin = auth.roles.some((r) => r.role === "super_admin");
    ensure(isSuperAdmin || sameUniversity, "Cannot view this announcement");

    res.json(data);
  }),
);
