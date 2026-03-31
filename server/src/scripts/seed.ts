import { supabaseAdmin, supabaseAnon } from "../config/supabase";

const PASSWORD = "Passw0rd!123";

type SeedUser = {
  email: string;
  fullName: string;
  role: "platform_admin" | "university_admin" | "student_organisation" | "student";
};

const users: SeedUser[] = [
  { email: "platform_admin@studentplatform.local", fullName: "Super Admin", role: "platform_admin" },
  { email: "uni_admin@spu.local", fullName: "University Admin", role: "university_admin" },
  { email: "student_org@spu.local", fullName: "Student Organisation", role: "student_organisation" },
  { email: "classrep_candidate@spu.local", fullName: "Class Rep Candidate", role: "student" },
  { email: "student1@spu.local", fullName: "Student One", role: "student" },
];

async function ensureUser(email: string, password: string) {
  const pageSize = 1000;
  const { data: listData, error: listError } = await supabaseAdmin.auth.admin.listUsers({
    page: 1,
    perPage: pageSize,
  });
  if (listError) throw listError;

  const found = listData.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (found) {
    await supabaseAdmin.auth.admin.updateUserById(found.id, { password, email_confirm: true });
    return found.id;
  }

  const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (createError || !created.user) throw createError ?? new Error("Failed to create user");
  return created.user.id;
}

async function ensureRole(userId: string, role: SeedUser["role"], universityId: string, classId: string | null) {
  let query = supabaseAdmin.from("user_roles").select("id").eq("user_id", userId).eq("role", role);

  if (role === "platform_admin") {
    query = query.is("university_id", null).is("class_id", null);
  } else if (role === "student") {
    query = query.eq("university_id", universityId).eq("class_id", classId);
  } else {
    query = query.eq("university_id", universityId).is("class_id", null);
  }

  const { data: existing, error: e1 } = await query.maybeSingle();
  if (e1) throw e1;
  if (existing) return;

  const payload = {
    user_id: userId,
    role,
    university_id: role === "platform_admin" ? null : universityId,
    class_id: role === "student" ? classId : null,
  };

  const { error } = await supabaseAdmin.from("user_roles").insert(payload);
  if (error && (error as { code?: string }).code !== "23505") throw error;
}

async function main() {
  const { data: uniData, error: uniError } = await supabaseAdmin
    .from("universities")
    .upsert({ name: "Student Platform University", code: "SPU", status: "active" }, { onConflict: "code" })
    .select("id")
    .single();
  if (uniError) throw uniError;

  const universityId = uniData.id as string;

  const { data: depData, error: depError } = await supabaseAdmin
    .from("departments")
    .upsert({ university_id: universityId, name: "Computer Science", code: "CS" }, { onConflict: "university_id,name" })
    .select("id")
    .single();
  if (depError) throw depError;

  const { data: classData, error: classError } = await supabaseAdmin
    .from("classes")
    .upsert(
      {
        university_id: universityId,
        department_id: depData.id,
        name: "CS Year 3 - A",
        code: "CS3A",
      },
      { onConflict: "university_id,code" },
    )
    .select("id")
    .single();
  if (classError) throw classError;

  const classId = classData.id as string;

  const userIds: Record<string, string> = {};
  for (const u of users) {
    const userId = await ensureUser(u.email, PASSWORD);
    userIds[u.email] = userId;

    const profilePayload = {
      id: userId,
      full_name: u.fullName,
      university_id: u.role === "platform_admin" ? null : universityId,
      class_id: u.role === "student" ? classId : null,
      status: "active" as const,
    };

    const { error: pErr } = await supabaseAdmin.from("profiles").upsert(profilePayload);
    if (pErr) throw pErr;

    await ensureRole(userId, u.role, universityId, u.role === "student" ? classId : null);
  }

  await supabaseAdmin.from("class_rep_requests").delete().eq("requester_id", userIds["classrep_candidate@spu.local"]);

  const { error: signInErr } = await supabaseAnon.auth.signInWithPassword({
    email: "student1@spu.local",
    password: PASSWORD,
  });
  if (signInErr) throw signInErr;

  console.log(
    JSON.stringify(
      {
        seeded: true,
        universityId,
        classId,
        users: Object.keys(userIds),
        password: PASSWORD,
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
