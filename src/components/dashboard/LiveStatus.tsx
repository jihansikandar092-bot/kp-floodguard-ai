import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { LiveDistrict, LiveMonitoring } from "@/lib/api/live-data";
import { SNAPSHOT_INTERVAL, STALE_SNAPSHOT_AGE } from "@/lib/api/snapshot-rules";

export function LiveStatus({ data, rows }: { data: LiveMonitoring; rows: LiveDistrict[] }) {
  const queryClient = useQueryClient();
  const unavailable = rows.some((d) => !d.weather || !d.flood || d.weatherError || d.floodError);
  const updated = rows
    .flatMap((d) => [d.weatherUpdatedAt, d.floodUpdatedAt])
    .filter((t): t is string => Boolean(t))
    .sort()
    .at(-1);
  const reasons = [...new Set(rows.flatMap((d) => [d.weatherError, d.floodError]).filter(Boolean))];
  const retained = rows
    .flatMap((d) => [d.weatherUpdatedAt, d.floodUpdatedAt])
    .filter((t): t is string => Boolean(t) && Date.now() - Date.parse(t ?? "") > SNAPSHOT_INTERVAL);
  const oldest = retained.sort()[0];
  const stale = updated && Date.now() - Date.parse(updated) > STALE_SNAPSHOT_AGE;
  return (
    <div className="space-y-2 border-b pb-4 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-semibold">Source: Open-Meteo / GloFAS</p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => queryClient.invalidateQueries({ queryKey: ["live-monitoring"] })}
        >
          <RefreshCw className="size-3.5" /> Refresh
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Last updated:{" "}
        {data.fetchedAt ? `${data.fetchedAt.replace("T", " ").slice(0, 19)} UTC` : "Not available"}{" "}
        · Modelled weather and river discharge, not gauge measurements.
      </p>
      <p className="text-xs text-muted-foreground">
        {data.fetchedAt
          ? `Data updated ${Math.max(0, Math.floor((Date.now() - Date.parse(data.fetchedAt)) / 60000))} minutes ago`
          : "Not available"}
      </p>
      {stale && (
        <p role="alert" className="text-emergency">
          Stale data: newest stored reading is older than 6 hours. Selected districts may use a
          browser fallback.
        </p>
      )}
      <p className="text-xs text-muted-foreground">
        {data.origin === "browser"
          ? "Selected district: direct browser fallback. Other districts use stored readings."
          : "Stored readings · scheduled refresh every 30 minutes."}
      </p>
      {oldest && (
        <p role="status" className="text-emergency">
          Retained readings: oldest source is{" "}
          {Math.floor((Date.now() - Date.parse(oldest)) / 60000)} minutes old. Last successful
          source update: {oldest.replace("T", " ").slice(0, 19)} UTC.
        </p>
      )}
      {unavailable && (
        <div role="alert" className="space-y-1 text-emergency">
          <p>
            Live data temporarily unavailable or outdated for{" "}
            {rows.filter((d) => !d.weather || !d.flood || d.weatherError || d.floodError).length}{" "}
            district(s).
          </p>
          {reasons.map((reason) => (
            <p key={reason}>{reason}</p>
          ))}
          <p>
            Available metrics are still displayed; unavailable metrics show Not available. Retained
            values use their last successful timestamp.
          </p>
        </div>
      )}
      {rows.length > 1 && (
        <p className="text-xs text-muted-foreground">
          Averages include available districts only: weather {rows.filter((d) => d.weather).length}/
          {rows.length}; river discharge {rows.filter((d) => d.flood).length}/{rows.length}.
          Individual missing metrics are excluded, not counted as zero.
        </p>
      )}
    </div>
  );
}
export function MonitoringError() {
  const router = useRouter();
  return (
    <div className="container-page space-y-4 py-12" role="alert">
      <h1 className="text-xl font-bold">Live data temporarily unavailable</h1>
      <Button variant="outline" onClick={() => router.invalidate()}>
        <RefreshCw /> Retry
      </Button>
    </div>
  );
}
export function MonitoringPending() {
  return (
    <div className="container-page py-12" role="status">
      Loading live weather and river forecasts…
    </div>
  );
}
