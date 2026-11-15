import { publicDbClient } from "./public-db.server";
import type { ServiceHealth } from "./service-health";

// Diagnostics contain fixed, public-safe messages only; never store upstream bodies or credentials.
export async function recordServiceHealth(service: string, ok: boolean, message?: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const at = new Date().toISOString();
  const { error } = await supabaseAdmin.from("service_health").upsert({service,
    ...(ok ? {last_success_at: at} : {last_error_at: at, last_error_text: message ?? "Service check failed"}),
  }, {onConflict: "service"});
  if (error) console.error("Service health record unavailable", service);
}

// Called only by the authenticated monitoring job/operator, not by public page reads.
export async function checkStoredServices() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const [{error: databaseError}, {data: history, error: historyError}, {data: snapshots, error: snapshotError}] = await Promise.all([
    supabaseAdmin.from("districts").select("id").limit(1),
    supabaseAdmin.from("historical_stats").select("id").limit(1),
    supabaseAdmin.from("monitoring_snapshots").select("metrics"),
  ]);
  await recordServiceHealth("Database", !databaseError, "Database check failed");
  await recordServiceHealth("Historical data", !historyError && Boolean(history?.length), historyError ? "Historical data check failed" : "No historical records available; no historical import job is connected.");
  // Recover genuine prior provider successes from stored metric timestamps, never from check time.
  if (!snapshotError) for (const service of ["Open-Meteo", "GloFAS"]) {
    const key = service === "Open-Meteo" ? "weatherUpdatedAt" : "floodUpdatedAt";
    const stamps = (snapshots ?? []).flatMap(({metrics}) => {
      if (!metrics || typeof metrics !== "object" || Array.isArray(metrics)) return [];
      const stamp = metrics[key];
      return typeof stamp === "string" && Number.isFinite(Date.parse(stamp)) ? [stamp] : [];
    }).sort();
    const latest = stamps.at(-1);
    const {data: existing} = await supabaseAdmin.from("service_health").select("last_success_at").eq("service",service).maybeSingle();
    if (latest && (!existing?.last_success_at || Date.parse(latest) > Date.parse(existing.last_success_at)))
      await supabaseAdmin.from("service_health").upsert({service,last_success_at: latest},{onConflict:"service"});
  }
  return { database: !databaseError, historicalRecordsAvailable: Boolean(history?.length) && !historyError };
}

export async function readPlatformHealth() {
  const client = publicDbClient();
  const [health, districts, snapshots, risks, history] = await Promise.all([
    client.from("service_health").select("service,last_success_at,last_error_at,last_error_text"),
    client.from("districts").select("id", {count:"exact",head:true}),
    client.from("monitoring_snapshots").select("metrics,fetched_at", {count:"exact"}),
    client.from("risk_assessments").select("computed_at").order("computed_at",{ascending:false}).limit(1),
    client.from("historical_stats").select("source",{count:"exact"}).limit(1),
  ]);
  const latestMetric = (key: string) => snapshots.error ? null : (snapshots.data ?? []).flatMap(({metrics}) => {
    if (!metrics || typeof metrics !== "object" || Array.isArray(metrics)) return [];
    const value = metrics[key];
    return typeof value === "string" && Number.isFinite(Date.parse(value)) ? [value] : [];
  }).sort().at(-1) ?? null;
  return {
    health: (health.data ?? []).map((r):ServiceHealth => ({service:r.service,lastSuccessAt:r.last_success_at,lastErrorAt:r.last_error_at,lastErrorText:r.last_error_text})),
    error: health.error ? "Service status temporarily unavailable" : null,
    districtCount: districts.error ? null : districts.count,
    snapshotCount: snapshots.error ? null : snapshots.count,
    sourceTimes: {weather:latestMetric("weatherUpdatedAt"), flood:latestMetric("floodUpdatedAt"),risk:risks.data?.[0]?.computed_at ?? null},
    historicalCount: history.error ? null : history.count,
    historicalSource: history.data?.[0]?.source ?? null,
  };
}