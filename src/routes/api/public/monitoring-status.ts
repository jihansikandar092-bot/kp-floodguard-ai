import { createFileRoute } from "@tanstack/react-router";
import { liveSnapshot } from "@/lib/api/live-data";

// Only fixed public environmental data; no credentials or caller-controlled URLs.
export const Route = createFileRoute("/api/public/monitoring-status")({
  server: { handlers: { GET: async () => {
    const { readMonitoringSnapshots } = await import("@/lib/api/monitoring-snapshots.server");
    const data = await readMonitoringSnapshots();
    return Response.json({ diagnostics: data.diagnostics, districts: data.districts.map(d => ({ id: d.id, weatherError: d.weatherError, floodError: d.floodError, weatherUpdatedAt: d.weatherUpdatedAt, floodUpdatedAt: d.floodUpdatedAt, values: liveSnapshot(data, d.id).totals })) }, { headers: { "Cache-Control": "no-store" } });
  } } },
});