import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { LiveDistrict, LiveMonitoring } from "@/lib/api/live-data";

export function LiveStatus({ data, rows }: { data: LiveMonitoring; rows: LiveDistrict[] }) {
  const queryClient = useQueryClient();
  const unavailable = rows.some(d => !d.weather || !d.flood);
  return <div className="space-y-2 border-b pb-4 text-sm">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="font-semibold">Source: Open-Meteo / GloFAS</p>
      <Button variant="outline" size="sm" onClick={() => queryClient.invalidateQueries({ queryKey: ["live-monitoring"] })}><RefreshCw className="size-3.5" /> Refresh</Button>
    </div>
    <p className="text-xs text-muted-foreground">Last updated: {rows.some(d => d.weather || d.flood) ? `${data.fetchedAt.replace("T", " ").slice(0, 19)} UTC` : "Unavailable"} · Modelled weather and river discharge, not gauge measurements.</p>
    {unavailable && <p role="alert" className="text-emergency">Live data temporarily unavailable for {rows.filter(d => !d.weather || !d.flood).length} district(s). Missing values are shown as —; no sample substitutes.</p>}
  </div>;
}
export function MonitoringError() {
  const router = useRouter();
  return <div className="container-page space-y-4 py-12" role="alert"><h1 className="text-xl font-bold">Live data temporarily unavailable</h1><Button variant="outline" onClick={() => router.invalidate()}><RefreshCw /> Retry</Button></div>;
}
export function MonitoringPending() {
  return <div className="container-page py-12" role="status">Loading live weather and river forecasts…</div>;
}