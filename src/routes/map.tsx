import { useSuspenseQuery } from "@tanstack/react-query";
import { liveMonitoringOptions } from "@/lib/api/monitoring-query";
import { useMonitoringFallback } from "@/lib/api/use-monitoring-fallback";
import { LiveStatus, MonitoringError, MonitoringPending } from "@/components/dashboard/LiveStatus";
import { Button } from "@/components/ui/button";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { KPMap, MapLegend } from "@/components/map/KPMap";
import { DistrictDetail } from "@/components/map/DistrictDetail";
import { SafetyNotice, PageHeader } from "@/components/site/Status";
import { districtListOptions } from "@/lib/api/district-query";
import { riskAssessmentOptions } from "@/lib/risk/risk-query";
import { RISK_COLOR_VAR } from "@/lib/data/districts";
import { RISK_DISCLAIMER } from "@/components/risk/RiskExplain";
import { HORIZONS, horizonLabel } from "@/lib/risk/outlook";

export const Route = createFileRoute("/map")({
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(liveMonitoringOptions()),
      context.queryClient.ensureQueryData(districtListOptions()),
      context.queryClient.ensureQueryData(riskAssessmentOptions()),
    ]);
  },
  pendingComponent: MonitoringPending,
  errorComponent: MonitoringError,
  notFoundComponent: () => <p className="container-page py-12">District not found.</p>,
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Interactive KP Flood Map — KP FloodGuard AI" },
      {
        name: "description",
        content:
          "Interactive map of Khyber Pakhtunkhwa with district flood-risk markers. Click a district for rainfall, live Open-Meteo weather and GloFAS river discharge and experimental risk estimates.",
      },
      { property: "og:title", content: "Interactive KP Flood Map — KP FloodGuard AI" },
      {
        property: "og:description",
        content: "Stored weather and modelled river discharge across Khyber Pakhtunkhwa.",
      },
    ],
  }),
  component: MapPage,
});

function MapPage() {
  const { data: DISTRICTS } = useSuspenseQuery(districtListOptions());
  const [chosenId, setSelectedId] = useState<string>();
  const [horizon, setHorizon] = useState(0);
  const district = DISTRICTS.find((d) => d.id === chosenId) ?? DISTRICTS[0];
  const selectedId = district?.id;
  const { data: allRisks } = useSuspenseQuery(riskAssessmentOptions());
  const risks = allRisks.filter((r) => r.horizonHours === horizon);
  const { data: storedData } = useSuspenseQuery(liveMonitoringOptions());
  const { data, fallbackLoading } = useMonitoringFallback(storedData, DISTRICTS, selectedId);
  if (!district) return <p className="container-page py-12">No monitored districts available.</p>;

  return (
    <>
      <PageHeader
        eyebrow="Interactive flood map"
        title="Khyber Pakhtunkhwa Risk Map"
        description="Select a district marker to see its rainfall, river discharge, weather and flood-risk category."
      />
      <div className="container-page space-y-6 py-8">
        <LiveStatus data={data} rows={data.districts} />
        {fallbackLoading && (
          <p role="status" className="text-sm text-muted-foreground">
            Fetching selected district directly from Open-Meteo…
          </p>
        )}
        <SafetyNotice>{RISK_DISCLAIMER}</SafetyNotice>
        <div className="flex flex-wrap items-center gap-3">
          <label htmlFor="map-horizon" className="text-sm font-bold">
            Risk horizon
          </label>
          <select
            id="map-horizon"
            value={horizon}
            onChange={(e) => setHorizon(Number(e.target.value))}
            className="rounded-md border bg-background p-2"
          >
            {HORIZONS.map((h) => (
              <option key={h} value={h}>
                {horizonLabel(h)}
              </option>
            ))}
          </select>
          <span className="text-xs text-muted-foreground">
            Underlying snapshot:{" "}
            {risks
              .find((r) => r.districtId === selectedId)
              ?.snapshotAt?.replace("T", " ")
              .slice(0, 16) ?? "Not available"}{" "}
            UTC
          </span>
        </div>
        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          <div className="overflow-hidden rounded-xl border bg-card shadow-card">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
              <MapLegend />
              <span className="text-xs text-muted-foreground">
                Marker size reflects rainfall (24h)
              </span>
            </div>
            <div className="relative z-0 h-[min(460px,65svh)] min-h-[320px] md:h-[600px]">
              <KPMap
                data={data}
                risks={risks}
                districts={DISTRICTS}
                selectedId={selectedId}
                onSelect={setSelectedId}
              />
            </div>
          </div>
          <aside className="rounded-xl border bg-card p-5 shadow-card" aria-live="polite">
            <DistrictDetail
              district={district}
              live={data.districts.find((d) => d.id === district.id)}
              fetchedAt={data.fetchedAt}
              risk={risks.find((r) => r.districtId === district.id)}
            />
          </aside>
        </div>

        <section aria-labelledby="district-list">
          <h2 id="district-list" className="text-lg font-bold">
            All districts
          </h2>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {DISTRICTS.map((d) => (
              <Button
                variant="outline"
                key={d.id}
                type="button"
                onClick={() => setSelectedId(d.id)}
                aria-pressed={d.id === selectedId}
                className={cn(
                  "flex items-center gap-2 rounded-lg border bg-card px-3 py-2.5 text-left text-sm font-medium transition-colors hover:border-primary",
                  d.id === selectedId && "border-primary bg-secondary",
                )}
              >
                <span
                  className="size-2.5 shrink-0 rounded-full bg-water"
                  style={(() => {
                    const r = risks.find((x) => x.districtId === d.id);
                    return r ? { background: RISK_COLOR_VAR[r.level] } : undefined;
                  })()}
                  aria-hidden
                />
                <span className="truncate">{d.name}</span>
              </Button>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
