import type { Json } from "@/integrations/supabase/types";
import { storedDistrictSchema } from "@/lib/api/live-data";
import { publicDbClient } from "@/lib/api/public-db.server";
import { assessOutlook, HORIZONS, translatedReasons } from "./outlook";
import { RISK_CONFIG } from "./engine";
import type { StoredRiskAssessment } from "./types";

type Admin = (typeof import("@/integrations/supabase/client.server"))["supabaseAdmin"];

/** Compute and store one assessment per stored snapshot (rule-based; no ML model connected). */
export async function assessStoredSnapshots(admin: Admin) {
  const [{ data: snaps, error }, { data: hist }] = await Promise.all([
    admin.from("monitoring_snapshots").select("id,district_id,metrics,fetched_at"),
    admin.from("historical_stats").select("district_id,annual_max_discharge"),
  ]);
  if (error) throw new Error("Risk engine could not read snapshots");
  const computedAt = new Date().toISOString();
  const rows = [];
  for (const snap of snaps ?? []) {
    const parsed = storedDistrictSchema.safeParse(snap.metrics);
    if (!snap.district_id || !parsed.success) continue;
    for (const horizon of HORIZONS) {
      const historicalAnnualMax = (hist ?? [])
        .filter((h) => h.district_id === snap.district_id)
        .map((h) => h.annual_max_discharge);
      const assessment = assessOutlook(
        {
          weather: parsed.data.weather,
          flood: parsed.data.flood,
          floodUpdatedAt: parsed.data.floodUpdatedAt,
          historicalAnnualMax,
        },
        horizon,
      );
      if (!assessment) continue;
      rows.push({
        district_id: snap.district_id,
        snapshot_id: snap.id,
        score: assessment.score,
        available_factors: assessment.availableFactors,
        level: assessment.level,
        confidence: assessment.confidence,
        factors: assessment.factors as unknown as Json,
        reason_text: assessment.reasonText,
        computed_at: computedAt,
        horizon_hours: horizon,
        snapshot_at:
          [parsed.data.weatherUpdatedAt, parsed.data.floodUpdatedAt]
            .filter((t): t is string => Boolean(t))
            .sort()[0] ?? snap.fetched_at,
        reason_templates: translatedReasons(assessment, horizon, historicalAnnualMax.length > 0),
      });
    }
  }
  if (rows.length) {
    const { error: writeError } = await admin.from("risk_assessments").insert(rows);
    if (writeError) throw new Error("Risk assessment write failed");
    for (const district of new Set(rows.map((r) => r.district_id))) {
      const { error: alertError } = await admin.rpc("sync_predictive_alert", {
        _district_id: district,
        _computed_at: computedAt,
        _max_horizon: RISK_CONFIG.alerts.maxHorizonHours,
        _fresh_hours: RISK_CONFIG.alerts.freshHours,
        _low_runs: RISK_CONFIG.alerts.lowRunsToResolve,
      });
      if (alertError) throw new Error("Predictive alert update failed");
    }
  }
  return rows.length;
}

/** Latest stored assessment per district (public read). */
export async function readLatestAssessments(): Promise<StoredRiskAssessment[]> {
  const { data, error } = await publicDbClient()
    .from("risk_assessments")
    .select(
      "district_id,snapshot_id,score,available_factors,level,confidence,factors,reason_text,computed_at,horizon_hours,snapshot_at,reason_templates",
    )
    .order("computed_at", { ascending: false })
    .limit(500);
  if (error) throw new Error("Risk assessments temporarily unavailable");
  const seen = new Set<string>();
  const latest: StoredRiskAssessment[] = [];
  for (const r of data ?? []) {
    const key = `${r.district_id}:${r.horizon_hours}`;
    if (seen.has(key)) continue;
    seen.add(key);
    latest.push({
      districtId: r.district_id,
      snapshotId: r.snapshot_id,
      score: r.score,
      availableFactors: r.available_factors,
      level: r.level as StoredRiskAssessment["level"],
      confidence: r.confidence === "Medium" ? "Medium" : "Low",
      factors: r.factors as unknown as StoredRiskAssessment["factors"],
      reasonText: r.reason_text,
      computedAt: r.computed_at,
      horizonHours: r.horizon_hours,
      snapshotAt: r.snapshot_at,
      reasonTemplates: r.reason_templates as Record<string, string>,
    });
  }
  return latest;
}
