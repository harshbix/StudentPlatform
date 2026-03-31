import { supabaseAdmin } from "../config/supabase";

export async function addStreakActivity(userId: string, source: string) {
  const today = new Date();
  const isoDay = today.toISOString().slice(0, 10);

  await supabaseAdmin
    .from("streak_logs")
    .upsert({ user_id: userId, activity_date: isoDay, source }, { onConflict: "user_id,activity_date,source" });

  const { data: rows } = await supabaseAdmin
    .from("streak_logs")
    .select("activity_date")
    .eq("user_id", userId)
    .order("activity_date", { ascending: false });

  const uniqueDays = Array.from(new Set((rows ?? []).map((r) => String(r.activity_date)))).sort().reverse();

  let streak = 0;
  let cursor = new Date(isoDay + "T00:00:00.000Z");
  for (const day of uniqueDays) {
    const expected = cursor.toISOString().slice(0, 10);
    if (day !== expected) break;
    streak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }

  await supabaseAdmin.from("profiles").update({ streak_count: streak }).eq("id", userId);
}
