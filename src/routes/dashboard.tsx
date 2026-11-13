import { useSuspenseQuery } from "@tanstack/react-query";
import { liveMonitoringOptions } from "@/lib/api/monitoring-query";
import { useMonitoringFallback } from "@/lib/api/use-monitoring-fallback";
import { liveSnapshot } from "@/lib/api/live-data";
import { LiveStatus, MonitoringError, MonitoringPending } from "@/components/dashboard/LiveStatus";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CloudRain, Droplets, MapPinned, Thermometer, Waves, Wind } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DemoBanner, PageHeader } from "@/components/site/Demo";
import { Panel, StatCard } from "@/components/dashboard/Panel";
import { RainfallChart, RiverChart } from "@/components/dashboard/Charts";
import { FEATURED_DISTRICTS, getDistrict } from "@/lib/data/districts";
import { getMonitoringSnapshot } from "@/lib/api/monitoring";

export const Route = createFileRoute("/dashboard")({
  validateSearch: (s: Record<string, unknown>): { district?: string | undefined } => {
    const d = s["district"];
    return { district: typeof d === "string" && getDistrict(d) ? d : undefined };
  },
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(liveMonitoringOptions());
  },
  pendingComponent: MonitoringPending,
  errorComponent: MonitoringError,
  notFoundComponent: () => <p className="container-page py-12">Monitoring data not found.</p>,
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Flood Monitoring Dashboard — KP FloodGuard AI" },
      {
        name: "description",
        content:
          "District-wise rainfall, river levels, weather, flood-risk distribution and historical trends for Khyber Pakhtunkhwa with live Open-Meteo weather and GloFAS discharge, without invented risk or historical observations.",
      },
      { property: "og:title", content: "Flood Monitoring Dashboard — KP FloodGuard AI" },
      {
        property: "og:description",
        content: "Rainfall, river levels and flood-risk comparison across KP districts.",
      },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const { district: districtId } = Route.useSearch();
  const snap = getMonitoringSnapshot(districtId);
  const { data: storedData } = useSuspenseQuery(liveMonitoringOptions());
  const { data, fallbackLoading } = useMonitoringFallback(storedData, districtId);
  const live = liveSnapshot(data, districtId);
  const t = live.totals;
  const scope = snap.district?.name ?? "All monitored districts";

  return (
    <>
      <PageHeader
        eyebrow="Flood monitoring dashboard"
        title={snap.district ? `${snap.district.name} District` : "Khyber Pakhtunkhwa Overview"}
        description="Weather, river and flood-risk indicators by district."
        actions={
          <Button asChild variant="outline">
            <Link to="/map">
              <MapPinned /> Open flood map
            </Link>
          </Button>
        }
      />
      <div className="container-page space-y-6 py-8">
        <LiveStatus data={data} rows={live.rows} />
        {fallbackLoading && (
          <p role="status" className="text-sm text-muted-foreground">
            Fetching selected district directly from Open-Meteo…
          </p>
        )}
        <DemoBanner>
          System-generated from modelled weather and river data. Experimental estimate, not an
          official warning.
        </DemoBanner>

        <nav aria-label="District filter" className="flex flex-wrap gap-2">
          <FilterChip active={!districtId} label="All districts" search={{ district: undefined }} />
          {FEATURED_DISTRICTS.map((d) => (
            <FilterChip
              key={d.id}
              active={districtId === d.id}
              label={d.name}
              search={{ district: d.id }}
            />
          ))}
        </nav>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <StatCard
            demo={false}
            icon={MapPinned}
            label="Districts monitored"
            value={data.referenceCount ?? "Not available"}
            hint={`${data.districts.filter((d) => d.weather && d.flood).length} with both sources`}
          />
          <StatCard
            demo={false}
            icon={CloudRain}
            label="Rainfall (past 24h)"
            value={t.rainfall24h ?? "Not available"}
            unit="mm"
            hint={snap.district ? scope : "District average"}
            tone="water"
          />
          <StatCard
            demo={false}
            icon={Waves}
            label="River discharge (today)"
            value={t.discharge ?? "Not available"}
            unit="m³/s"
            hint={snap.district ? "GloFAS model forecast" : "District average · GloFAS"}
            tone="water"
          />
          <StatCard
            demo={false}
            icon={Thermometer}
            label="Temperature"
            value={t.temperature ?? "Not available"}
            unit="°C"
          />
          <StatCard
            demo={false}
            icon={Droplets}
            label="Humidity"
            value={t.humidity ?? "Not available"}
            unit="%"
          />
          <StatCard
            demo={false}
            icon={Wind}
            label="Wind speed"
            value={t.wind ?? "Not available"}
            unit="km/h"
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Panel
            title="Rainfall trend"
            subtitle={`Past 3 days + next 7 days · ${scope} · mm`}
            action={<span className="text-xs text-water">Open-Meteo</span>}
            className="lg:col-span-2"
            bodyClassName="h-72"
          >
            {live.rainfall.some((d) => d.rainfall !== null) ? (
              <RainfallChart data={live.rainfall} />
            ) : (
              <p role="status">
                {live.rows.find((d) => d.weatherError)?.weatherError ??
                  "Rainfall data not available"}
              </p>
            )}
          </Panel>
          <Panel title="Flood-risk distribution">
            <p>Not available</p>
          </Panel>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Panel
            title="River discharge"
            subtitle={`Past 7 days + next 7 days · ${scope} · m³/s (UTC dates)`}
            action={<span className="text-xs text-water">GloFAS</span>}
            className="lg:col-span-2"
            bodyClassName="h-72"
          >
            {live.river.some((d) => d.discharge !== null) ? (
              <RiverChart data={live.river} />
            ) : (
              <p role="status">
                {live.rows.find((d) => d.floodError)?.floodError ??
                  "River discharge data not available"}
              </p>
            )}
          </Panel>
          <Panel title="Recent flood alerts">
            <p>Not available</p>
          </Panel>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Panel title="Historical flood events">
            <p>Not available</p>
          </Panel>
          <Panel title="District-wise risk comparison">
            <p>Not available</p>
          </Panel>
        </div>
      </div>
    </>
  );
}

function FilterChip({
  active,
  label,
  search,
  dot,
}: {
  active: boolean;
  label: string;
  search: { district?: string | undefined };
  dot?: string;
}) {
  return (
    <Link
      to="/dashboard"
      search={search}
      aria-current={active ? "page" : undefined}
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "bg-card hover:border-primary",
      )}
    >
      {dot && <span className="size-2 rounded-full" style={{ background: dot }} aria-hidden />}
      {label}
    </Link>
  );
}
