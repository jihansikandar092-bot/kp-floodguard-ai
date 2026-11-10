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
  const { data, error } = await client.from("monitoring_snapshots").select("district,metrics,fetched_at");
  if (error) throw new Error("Monitoring storage temporarily unavailable");
  return { origin: "snapshot", fetchedAt: data?.map(row => row.fetched_at).sort().at(-1) ?? "", districts: DISTRICTS.map(d => {
    const row = data?.find(row => row.district === d.id);
    const parsed = storedDistrictSchema.safeParse(row?.metrics);
    if (parsed.success) return { ...parsed.data, id: d.id, weatherError: parsed.data.weatherError ?? null, floodError: parsed.data.floodError ?? null };
    return { id: d.id, weather: null, flood: null, weatherUpdatedAt: null, floodUpdatedAt: null, weatherError: "No stored Open-Meteo snapshot available", floodError: "No stored GloFAS snapshot available" };
  }) };
}

// Called only by the authenticated scheduler, never by page reads.
export async function refreshMonitoringSnapshots() {
  const previous = await readMonitoringSnapshots();
  const latest = await fetchLiveData(retryingMonitoringFetch());
  const rows = latest.districts.map(next => mergeSnapshot(previous.districts.find(d => d.id === next.id), next))
    .filter(row => row.weather || row.flood)
    .map(row => ({ district: row.id, metrics: row as unknown as Json, fetched_at: [row.weatherUpdatedAt, row.floodUpdatedAt].filter((v): v is string => Boolean(v)).sort().at(-1) ?? latest.fetchedAt }));
  if (rows.length) {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("monitoring_snapshots").upsert(rows, { onConflict: "district" });
    if (error) throw new Error("Monitoring snapshot write failed");
  }
  console.info("Monitoring snapshot refresh", JSON.stringify({ saved: rows.length, diagnostics: latest.diagnostics }));
  return { saved: rows.length, diagnostics: latest.diagnostics };
}