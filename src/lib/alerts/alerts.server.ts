import { publicDbClient } from "@/lib/api/public-db.server";

export async function readAlerts() {
  const db = publicDbClient();
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const columns = "id,district_id,level,title,reason_text,created_at,resolved_at,source,type,horizon_hours,expected_by,escalated_at,updated_at,reason_templates,risk_assessment_id";
  const [active, recent] = await Promise.all([
    db
      .from("alerts")
      .select(columns)
      .is("resolved_at", null)
      .order("created_at", { ascending: false }),
    db
      .from("alerts")
      .select(columns)
      .gte("resolved_at", since)
      .order("created_at", { ascending: false }),
  ]);
  if (active.error || recent.error) throw new Error("Alerts temporarily unavailable");
  return { expected: (active.data ?? []).filter(r=>r.type==='expected'), active: (active.data ?? []).filter(r=>r.type==='active'), recent: recent.data ?? [] };
}
