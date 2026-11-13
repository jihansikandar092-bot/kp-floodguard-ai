import { useQueryClient } from "@tanstack/react-query";
import { useHydrated, useRouter } from "@tanstack/react-router";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { LiveDistrict, LiveMonitoring } from "@/lib/api/live-data";
import { freshness } from "@/lib/api/snapshot-rules";
import { cn } from "@/lib/utils";

export function LiveStatus({ data, rows }: { data: LiveMonitoring; rows: LiveDistrict[] }) {
  const queryClient = useQueryClient();
  const unavailable = rows.some((d) => !d.weather || !d.flood || d.weatherError || d.floodError);
  const updated = rows
    .flatMap((d) => [d.weatherUpdatedAt, d.floodUpdatedAt])
    .filter((t): t is string => Boolean(t))
    .sort()
    .at(-1);
  const reasons = [...new Set(rows.flatMap((d) => [d.weatherError, d.floodError]).filter(Boolean))];
  // Age-based text depends on the viewer clock, so it renders only after hydration.
  const hydrated = useHydrated();
  const fresh = hydrated ? freshness(data.fetchedAt) : { level: "unknown" as const, label: "…" };
  const retained = rows.filter((d) => d.retainedMetrics?.length);
  const minutes = (t: string) =>
    !hydrated ? "…" : Math.max(0, Math.floor((Date.now() - Date.parse(t)) / 60000));
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
        <span
          data-freshness={fresh.level}
          className={cn(
            "ml-1 inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold",
            fresh.level === "live" && "border-primary/30 text-primary",
            fresh.level === "delayed" && "border-border text-foreground",
            fresh.level === "outdated" && "border-emergency text-emergency",
          )}
        >
          {fresh.label}
        </span>{" "}
        · Modelled weather and river discharge, not gauge measurements.
      </p>
      <p className="text-xs text-muted-foreground">
        {data.fetchedAt ? `Data updated ${minutes(data.fetchedAt)} minutes ago` : "Not available"}
      </p>
      {fresh.level === "outdated" && (
        <p role="alert" className="text-emergency">
          Outdated: newest stored reading is older than 3 hours. After 6 hours the selected district
          is fetched directly in your browser.
        </p>
      )}
      <p className="text-xs text-muted-foreground">
        {data.origin === "browser"
          ? "Selected district: direct browser fallback. Other districts use stored readings."
          : "Stored readings · scheduled refresh every 30 minutes."}
      </p>
      {data.origin === "browser" && data.browserCachedAt && (
        <p className="text-xs text-muted-foreground">
          Browser copy saved on this device {minutes(data.browserCachedAt)} minutes ago (
          {data.browserCachedAt.replace("T", " ").slice(0, 19)} UTC).
        </p>
      )}
      {data.origin === "browser" && updated && (
        <p className="text-xs text-muted-foreground">
          Browser source updated: {updated.replace("T", " ").slice(0, 19)} UTC. Stored age above is
          unchanged.
        </p>
      )}
      {retained.length > 0 && (
        <div role="status" className="space-y-0.5 text-xs text-muted-foreground">
          <p className="font-medium text-foreground">Last good value kept for:</p>
          {retained.map((d) => (
            <p key={d.id}>
              {d.id}:{" "}
              {d.retainedMetrics
                ?.map((m) => `${m.metric}${m.since ? ` (${minutes(m.since)} min old)` : ""}`)
                .join(", ")}
            </p>
          ))}
        </div>
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
