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
import { DemoBanner, PageHeader } from "@/components/site/Demo";
import { DISTRICTS, RISK_COLOR_VAR, getDistrict } from "@/lib/data/districts";

export const Route = createFileRoute("/map")({
  loader: async ({ context }) => { await context.queryClient.ensureQueryData(liveMonitoringOptions()); },
  pendingComponent: MonitoringPending,
  errorComponent: MonitoringError,
  notFoundComponent: () => <p className="container-page py-12">District not found.</p>,
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Interactive KP Flood Map — KP FloodGuard AI" },
      { name: "description", content: "Interactive map of Khyber Pakhtunkhwa with district flood-risk markers. Click a district for rainfall, live Open-Meteo weather and GloFAS river discharge (risk categories remain demo)." },
      { property: "og:title", content: "Interactive KP Flood Map — KP FloodGuard AI" },
      { property: "og:description", content: "Colour-coded district flood risk across Khyber Pakhtunkhwa." },
    ],
  }),
  component: MapPage,
});

function MapPage() {
  const [selectedId, setSelectedId] = useState("swat");
  const { data: storedData } = useSuspenseQuery(liveMonitoringOptions());
  const { data, fallbackLoading } = useMonitoringFallback(storedData, selectedId);
  const district = getDistrict(selectedId) ?? DISTRICTS[0];
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
        {fallbackLoading && <p role="status" className="text-sm text-muted-foreground">Fetching selected district directly from Open-Meteo…</p>}
        <DemoBanner>
          <strong>DEMO risk categories.</strong> Marker colours show sample risk only; sizes reflect live rainfall. Weather and discharge come from Open-Meteo / GloFAS, not a verified flood-risk model.
        </DemoBanner>
        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          <div className="overflow-hidden rounded-xl border bg-card shadow-card">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
              <MapLegend />
              <span className="text-xs text-muted-foreground">Marker size reflects rainfall (24h)</span>
            </div>
            <div className="relative z-0 h-[460px] md:h-[600px]">
              <KPMap data={data} selectedId={selectedId} onSelect={setSelectedId} />
            </div>
          </div>
          <aside className="rounded-xl border bg-card p-5 shadow-card" aria-live="polite">
            <DistrictDetail district={district} live={data.districts.find(d => d.id === district.id)} fetchedAt={data.fetchedAt} />
          </aside>
        </div>

        <section aria-labelledby="district-list">
          <h2 id="district-list" className="text-lg font-bold">All districts</h2>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {DISTRICTS.map((d) => (
              <Button variant="outline"
                key={d.id}
                type="button"
                onClick={() => setSelectedId(d.id)}
                aria-pressed={d.id === selectedId}
                className={cn(
                  "flex items-center gap-2 rounded-lg border bg-card px-3 py-2.5 text-left text-sm font-medium transition-colors hover:border-primary",
                  d.id === selectedId && "border-primary bg-secondary",
                )}
              >
                <span className="size-2.5 shrink-0 rounded-full" style={{ background: RISK_COLOR_VAR[d.demo.riskLevel] }} aria-hidden />
                <span className="truncate">{d.name}</span>
              </Button>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
