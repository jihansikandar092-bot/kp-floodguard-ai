import { createClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/integrations/supabase/types";
import { DISTRICTS } from "@/lib/data/districts";
import { fetchLiveData, storedDistrictSchema, type LiveMonitoring } from "./live-data";
import { mergeSnapshot, retryingMonitoringFetch } from "./snapshot-rules";

export async function readMonitoringSnapshots(): Promise<LiveMonitoring> {
  const key = process.env['SUPABASE_PUBLISHABLE_KEY'];
  const url = process.env['SUPABASE_URL'];
  if (!key || !url) throw new Error("Monitoring storage unavailable");
  const client = createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (input, init) => {
      const headers = new Headers(init?.headers);
      if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) headers.delete("Authorization");
      headers.set("apikey", key);
      return fetch(input, { ...init, headers });
    } },
  });
  const [{ data, error }, references] = await Promise.all([
    client.from("monitoring_snapshots").select("district_id,metrics,fetched_at"),
    client.from("districts").select("id", { count: "exact" }),
  ]);
  if (error) throw new Error("Monitoring storage temporarily unavailable");
  return { origin: "snapshot", referenceCount: references.count ?? 0, fetchedAt: data?.map(row => row.fetched_at).sort().at(-1) ?? "", districts: DISTRICTS.map(d => {
    const row = data?.find(row => row.district_id === d.id);
    const parsed = storedDistrictSchema.safeParse(row?.metrics);
    if (parsed.success) return { ...parsed.data, id: d.id, weatherError: parsed.data.weatherError ?? null, floodError: parsed.data.floodError ?? null };
    return { id: d.id, weather: null, flood: null, weatherUpdatedAt: null, floodUpdatedAt: null, weatherError: "No stored Open-Meteo snapshot available", floodError: "No stored GloFAS snapshot available" };
  }) };
}

// Called only by the authenticated scheduler, never by page reads.
export async function refreshMonitoringSnapshots() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const startedAt = new Date().toISOString();
  const { data: run, error: startError } = await supabaseAdmin.from("monitoring_runs").insert({ started_at: startedAt }).select("id").single();
  if (startError || !run) throw new Error("Monitoring run logging unavailable");
  try {
  const previous = await readMonitoringSnapshots();
  const latest = await fetchLiveData(retryingMonitoringFetch(), DISTRICTS, { baseUrl: process.env['OPEN_METEO_BASE_URL'], apiKey: process.env['OPEN_METEO_API_KEY'] });
  const rows = latest.districts.map(next => mergeSnapshot(previous.districts.find(d => d.id === next.id), next))
    .filter(row => row.weather || row.flood)
    .map(row => ({ district: row.id, district_id: row.id, metrics: row as unknown as Json, fetched_at: [row.weatherUpdatedAt, row.floodUpdatedAt].filter((v): v is string => Boolean(v)).sort().at(-1) ?? latest.fetchedAt }));
  if (rows.length) {
    const { error } = await supabaseAdmin.from("monitoring_snapshots").upsert(rows, { onConflict: "district" });
    if (error) throw new Error("Monitoring snapshot write failed");
  }
  const finishedAt = new Date().toISOString();
  const ok = latest.districts.filter(d => d.weather && d.flood).length;
  const errors = [...new Set(latest.districts.flatMap(d => [d.weatherError, d.floodError]).filter(Boolean))];
  const health = ["Open-Meteo", "GloFAS"].map(service => {
    const diagnostic = latest.diagnostics?.find(d => d.source === service);
    const success = latest.districts.some(d => service === "Open-Meteo" ? d.weather : d.flood);
    return { service, ...(success ? { last_success_at: finishedAt } : {}), ...(diagnostic?.error ? { last_error_at: finishedAt, last_error_text: diagnostic.error } : {}) };
  });
  const results = await Promise.all([
    supabaseAdmin.from("monitoring_runs").update({ finished_at: finishedAt, status: ok === DISTRICTS.length ? "success" : ok > 0 || latest.districts.some(d => d.weather || d.flood) ? "partial" : "failed", http_status: Object.fromEntries((latest.diagnostics ?? []).map(d => [d.source, d.status])), districts_ok: ok, districts_failed: DISTRICTS.length - ok, error_text: errors.join("; ") || null }).eq("id", run.id),
    supabaseAdmin.from("service_health").upsert(health, { onConflict: "service" }),
  ]);
  if (results.some(result => result.error)) throw new Error("Monitoring audit write failed");
  console.info("Monitoring snapshot refresh", JSON.stringify({ saved: rows.length, diagnostics: latest.diagnostics }));
  return { saved: rows.length, diagnostics: latest.diagnostics };
  } catch (error) {
    await supabaseAdmin.from("monitoring_runs").update({ status: "failed", finished_at: new Date().toISOString(), districts_failed: DISTRICTS.length, error_text: "Monitoring refresh failed; prior snapshots retained" }).eq("id", run.id);
    throw error;
  }
}