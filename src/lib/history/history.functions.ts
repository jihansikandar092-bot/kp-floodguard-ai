import { createServerFn } from "@tanstack/react-start";

export const getHistoricalData = createServerFn({ method: "GET" }).handler(async () => {
  const { publicDbClient } = await import("@/lib/api/public-db.server");
  const client = publicDbClient();
  const [stats, progress] = await Promise.all([
    client.from("historical_stats").select("district_id,year,max_discharge_m3s,max_rain_1d_mm,max_rain_3d_mm,total_rain_mm,source,fetched_at").order("year").limit(1000),
    client.from("historical_job_progress").select("district_id,status,phase,last_error,updated_at"),
  ]);
  return { stats: stats.data ?? [], progress: progress.data ?? [], error: stats.error || progress.error ? "Historical storage temporarily unavailable" : null };
});