import { supabaseAdmin } from "../config/supabase";

async function check() {
  const { data: subs } = await supabaseAdmin.from('submissions').select('task_id, student_id');
  const subCounts = new Map();
  let subDupes = 0;
  subs?.forEach((s: any) => {
     const k = `${s.task_id}-${s.student_id}`;
     if (subCounts.has(k)) subDupes++;
     subCounts.set(k, true);
  });

  const { data: atts } = await supabaseAdmin.from('attendance_records').select('session_id, student_id');
  const attCounts = new Map();
  let attDupes = 0;
  atts?.forEach((a: any) => {
     const k = `${a.session_id}-${a.student_id}`;
     if (attCounts.has(k)) attDupes++;
     attCounts.set(k, true);
  });

  console.log(`Submissions Total: ${subs?.length}, Duplicates: ${subDupes}`);
  console.log(`Attendance Total: ${atts?.length}, Duplicates: ${attDupes}`);
}
check().catch(console.error);