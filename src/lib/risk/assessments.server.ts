import type { Json } from "@/integrations/supabase/types";
import { storedDistrictSchema } from "@/lib/api/live-data";
import { publicDbClient } from "@/lib/api/public-db.server";
import { assessWithFallback } from "./model-api";
import type { StoredRiskAssessment } from "./types";

type Admin = (typeof import("@/integrations/supabase/client.server"))["supabaseAdmin"];

/** Compute and store one assessment per stored snapshot (rule-based; no ML model connected). */
export async function assessStoredSnapshots(admin: Admin) {
  const [{ data: snaps, error }, { data: hist }] = await Promise.all([
    admin.from("monitoring_snapshots").select("id,district_id,metrics"),
    admin.from("historical_stats").select("district_id,annual_max_discharge"),
  ]);
  if (error) throw new Error("Risk engine could not read snapshots");
  const computedAt = new Date().toISOString();
  const rows = [];
  for (const snap of snaps ?? []) {
    const parsed = storedDistrictSchema.safeParse(snap.metrics);
    if (!snap.district_id || !parsed.success) continue;
    const { assessment } = await assessWithFallback(null, {
      districtId: snap.district_id,
      weather: parsed.data.weather,
      flood: parsed.data.flood,
      floodUpdatedAt: parsed.data.floodUpdatedAt,
      historicalAnnualMax: (hist ?? [])
        .filter((h) => h.district_id === snap.district_id)
        .map((h) => h.annual_max_discharge),
    });
    if (!assessment) continue;
    rows.push({
      district_id: snap.district_id,
      snapshot_id: snap.id,
      score: assessment.score,
      level: assessment.level,
      confidence: assessment.confidence,
      factors: assessment.factors as unknown as Json,
      reason_text: assessment.reasonText,
      computed_at: computedAt,
    });
  }
  if (rows.length) {
    const { error: writeError } = await admin.from("risk_assessments").insert(rows);
    if (writeError) throw new Error("Risk assessment write failed");
  }
  return rows.length;
}

/** Latest stored assessment per district (public read). */
export async function readLatestAssessments(): Promise<StoredRiskAssessment[]> {
  const { data, error } = await publicDbClient()
    .from("risk_assessments")
    .select("district_id,snapshot_id,score,level,confidence,factors,reason_text,computed_at")
    .order("computed_at", { ascending: false })
    .limit(500);
  if (error) throw new Error("Risk assessments temporarily unavailable");
  const seen = new Set<string>();
  const latest: StoredRiskAssessment[] = [];
  for (const r of data ?? []) {
    if (seen.has(r.district_id)) continue;
    seen.add(r.district_id);
    latest.push({
      districtId: r.district_id,
      snapshotId: r.snapshot_id,
      score: r.score,
      level: r.level as StoredRiskAssessment["level"],
      confidence: r.confidence === "Medium" ? "Medium" : "Low",
      factors: r.factors as unknown as StoredRiskAssessment["factors"],
      reasonText: r.reason_text,
      computedAt: r.computed_at,
    });
  }
  return latest;
}
