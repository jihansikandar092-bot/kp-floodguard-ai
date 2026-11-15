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
        <p className="text-xs text-muted-foreground">
          <span
            data-freshness={fresh.level}
            className={cn(
              "mr-1.5 inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold",
              fresh.level === "live" && "border-primary/30 text-primary",
              fresh.level === "delayed" && "border-border text-foreground",
              fresh.level === "outdated" && "border-emergency text-emergency",
            )}
          >
            {fresh.label}
          </span>
          <span className="font-semibold text-foreground">Open-Meteo / GloFAS</span> · Last updated{" "}
          {data.fetchedAt
            ? `${data.fetchedAt.replace("T", " ").slice(0, 16)} UTC (${minutes(data.fetchedAt)} min ago)`
            : "Not available"}{" "}
          · Modelled data, not gauge measurements.
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => queryClient.invalidateQueries({ queryKey: ["live-monitoring"] })}
        >
          <RefreshCw className="size-3.5" /> Refresh
        </Button>
      </div>
      {fresh.level === "outdated" && (
        <p className="text-xs text-muted-foreground">
          Showing the last saved readings (older than 3 hours). Fresh data loads automatically when
          available.
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
      {hydrated && <RetainedDetails rows={retained} />}
      {unavailable && (
        <div className="rounded-md border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          <p>
            Some live readings are temporarily unavailable for{" "}
            {rows.filter((d) => !d.weather || !d.flood || d.weatherError || d.floodError).length}{" "}
            district(s); last saved values are shown. Missing values show Not available.
          </p>
          {reasons.length > 0 && (
            <details className="mt-1">
              <summary className="cursor-pointer">Technical details</summary>
              <div className="mt-1 space-y-0.5">
                {reasons.map((reason) => (
                  <p key={reason}>{reason}</p>
                ))}
              </div>
            </details>
          )}
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
const STALE_MS = 3 * 60 * 60 * 1000;
/** Collapsed list of retained readings that are older than 3 hours or have no timestamp. */
export function RetainedDetails({
  rows,
}: {
  rows: Pick<LiveDistrict, "id" | "retainedMetrics">[];
}) {
  const items = rows
    .map((d) => ({
      id: d.id,
      metrics: (d.retainedMetrics ?? []).filter(
        (m) => !m.since || Date.now() - Date.parse(m.since) > STALE_MS,
      ),
    }))
    .filter((d) => d.metrics.length > 0);
  if (!items.length) return null;
  return (
    <details className="text-xs text-foreground">
      <summary className="cursor-pointer font-medium">Retained readings (details)</summary>
      <ul className="mt-1 space-y-0.5 pl-4">
        {items.map((d) => (
          <li key={d.id}>
            {d.id}:{" "}
            {d.metrics
              .map((m) =>
                m.since
                  ? `${m.metric} (from ${m.since.replace("T", " ").slice(0, 16)} UTC)`
                  : `${m.metric} (missing)`,
              )
              .join(", ")}
          </li>
        ))}
      </ul>
    </details>
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
