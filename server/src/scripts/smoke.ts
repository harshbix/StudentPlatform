import assert from "node:assert";
import request from "supertest";
import { app } from "../app";
import { supabaseAdmin } from "../config/supabase";

const PASSWORD = "Passw0rd!123";

async function login(email: string) {
  const res = await request(app).post("/api/auth/login").send({ email, password: PASSWORD });
  assert.equal(res.status, 200, `login failed for ${email}: ${JSON.stringify(res.body)}`);
  return res.body.access_token as string;
}

async function main() {
  const [superToken, uniToken, repCandidateToken, studentToken] = await Promise.all([
    login("super_admin@studentplatform.local"),
    login("uni_admin@spu.local"),
    login("classrep_candidate@spu.local"),
    login("student1@spu.local"),
  ]);

  const { data: uni } = await supabaseAdmin.from("universities").select("id").eq("code", "SPU").single();
  const { data: cls } = await supabaseAdmin.from("classes").select("id").eq("code", "CS3A").single();
  if (!uni?.id || !cls?.id) throw new Error("Seeded university/class not found");

  const health = await request(app).get("/api/health");
  assert.equal(health.status, 200);

  const healthDb = await request(app).get("/api/health/db");
  assert.equal(healthDb.status, 200);

  const reqCreate = await request(app)
    .post("/api/class-rep-requests")
    .set("Authorization", `Bearer ${repCandidateToken}`)
    .send({ class_id: cls.id, request_reason: "I can coordinate task and attendance operations" });
  assert.equal(reqCreate.status, 201, JSON.stringify(reqCreate.body));

  const reqList = await request(app)
    .get(`/api/class-rep-requests/university/${uni.id}`)
    .set("Authorization", `Bearer ${uniToken}`);
  assert.equal(reqList.status, 200);

  const pending = (reqList.body as Array<{ id: string; requester_id: string; status: string }>).find(
    (r) => r.status === "pending",
  );
  if (!pending?.id) throw new Error("No pending class rep request found");

  const approve = await request(app)
    .patch(`/api/class-rep-requests/${pending.id}/review`)
    .set("Authorization", `Bearer ${uniToken}`)
    .send({ status: "approved" });
  assert.equal(approve.status, 200, JSON.stringify(approve.body));

  const repTask = await request(app)
    .post("/api/tasks")
    .set("Authorization", `Bearer ${repCandidateToken}`)
    .send({
      class_id: cls.id,
      title: "Smoke Task",
      description: "Submit text or file proof",
      due_at: new Date(Date.now() + 86400000).toISOString(),
      proof_type: "both",
      status: "published",
    });
  assert.equal(repTask.status, 201, JSON.stringify(repTask.body));

  const taskId = repTask.body.id as string;

  const studentTasks = await request(app).get("/api/tasks").set("Authorization", `Bearer ${studentToken}`);
  assert.equal(studentTasks.status, 200);
  assert.ok((studentTasks.body as Array<{ id: string }>).some((t) => t.id === taskId));

  const submit = await request(app)
    .post("/api/submissions")
    .set("Authorization", `Bearer ${studentToken}`)
    .send({ task_id: taskId, text_response: "Completed in smoke test" });
  assert.equal(submit.status, 201, JSON.stringify(submit.body));

  const submissionId = submit.body.id as string;

  const review = await request(app)
    .patch(`/api/submissions/${submissionId}/review`)
    .set("Authorization", `Bearer ${repCandidateToken}`)
    .send({ status: "approved", feedback: "Looks good" });
  assert.equal(review.status, 200, JSON.stringify(review.body));

  const startAttendance = await request(app)
    .post("/api/attendance/sessions")
    .set("Authorization", `Bearer ${repCandidateToken}`)
    .send({
      class_id: cls.id,
      starts_at: new Date(Date.now() - 60000).toISOString(),
      ends_at: new Date(Date.now() + 600000).toISOString(),
      suspicious: true,
      suspicion_reason: "Random verification sample",
    });
  assert.equal(startAttendance.status, 201, JSON.stringify(startAttendance.body));

  const markAttendance = await request(app)
    .post("/api/attendance/records")
    .set("Authorization", `Bearer ${studentToken}`)
    .send({ session_id: startAttendance.body.id });
  assert.equal(markAttendance.status, 201, JSON.stringify(markAttendance.body));

  const ann = await request(app)
    .post("/api/announcements")
    .set("Authorization", `Bearer ${uniToken}`)
    .send({
      university_id: uni.id,
      scope: "university",
      title: "Smoke Announcement",
      body: "University-wide notice",
      priority: "normal",
    });
  assert.equal(ann.status, 201, JSON.stringify(ann.body));

  const relevant = await request(app)
    .get("/api/announcements/relevant")
    .set("Authorization", `Bearer ${studentToken}`);
  assert.equal(relevant.status, 200);
  assert.ok((relevant.body as Array<{ id: string }>).some((a) => a.id === ann.body.id));

  const gamification = await request(app)
    .get("/api/gamification/summary")
    .set("Authorization", `Bearer ${studentToken}`);
  assert.equal(gamification.status, 200);

  const notifications = await request(app)
    .get("/api/notifications")
    .set("Authorization", `Bearer ${studentToken}`);
  assert.equal(notifications.status, 200);

  const superUniversities = await request(app)
    .get("/api/universities")
    .set("Authorization", `Bearer ${superToken}`);
  assert.equal(superUniversities.status, 200);

  console.log("Smoke test passed");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
