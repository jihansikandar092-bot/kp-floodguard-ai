import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, CloudRain, Droplets, MapPinned, Thermometer, Waves, Wind } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DemoBanner, PageHeader, RiskBadge } from "@/components/site/Demo";
import { Panel, StatCard } from "@/components/dashboard/Panel";
import {
  HistoricalChart,
  RainfallChart,
  RiskComparisonChart,
  RiskDistributionChart,
  RiverChart,
} from "@/components/dashboard/Charts";
import { FEATURED_DISTRICTS, getDistrict, RISK_COLOR_VAR } from "@/lib/data/districts";
import { getMonitoringSnapshot } from "@/lib/api/monitoring";

export const Route = createFileRoute("/dashboard")({
  validateSearch: (s: Record<string, unknown>): { district?: string } => ({
    district: typeof s.district === "string" && getDistrict(s.district) ? s.district : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Flood Monitoring Dashboard — KP FloodGuard AI" },
      { name: "description", content: "District-wise rainfall, river levels, weather, flood-risk distribution and historical trends for Khyber Pakhtunkhwa (demo data)." },
      { property: "og:title", content: "Flood Monitoring Dashboard — KP FloodGuard AI" },
      { property: "og:description", content: "Rainfall, river levels and flood-risk comparison across KP districts." },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const { district: districtId } = Route.useSearch();
  const snap = getMonitoringSnapshot(districtId);
  const t = snap.totals;
  const scope = snap.district?.name ?? "All monitored districts";
  const riverPct = Math.round((t.riverLevel / t.dangerLevel) * 100);

  return (
    <>
      <PageHeader
        eyebrow="Flood monitoring dashboard"
        title={snap.district ? `${snap.district.name} District` : "Khyber Pakhtunkhwa Overview"}
        description="Weather, river and flood-risk indicators by district."
        actions={
          <Button asChild variant="outline">
            <Link to="/map"><MapPinned /> Open flood map</Link>
          </Button>
        }
      />
      <div className="container-page space-y-6 py-8">
        <DemoBanner>
          <strong>Demo data.</strong> All figures on this page are illustrative sample values, not live
          observations or forecasts. Open-Meteo weather, GloFAS river data and the ML risk model are not
          connected yet.
        </DemoBanner>

        <nav aria-label="District filter" className="flex flex-wrap gap-2">
          <FilterChip active={!districtId} label="All districts" search={{ district: undefined }} />
          {FEATURED_DISTRICTS.map((d) => (
            <FilterChip key={d.id} active={districtId === d.id} label={d.name} search={{ district: d.id }} dot={RISK_COLOR_VAR[d.demo.riskLevel]} />
          ))}
        </nav>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <StatCard icon={MapPinned} label="Districts monitored" value={t.districtsMonitored} hint="Demo network" />
          <StatCard icon={CloudRain} label="Rainfall (24h)" value={t.rainfall24h} unit="mm" hint={snap.district ? scope : "Average"} tone="water" />
          <StatCard icon={Waves} label="River water level" value={t.riverLevel} unit="m" hint={`${riverPct}% of danger mark`} tone={riverPct >= 85 ? "emergency" : "water"} />
          <StatCard icon={Thermometer} label="Temperature" value={t.temperature} unit="°C" />
          <StatCard icon={Droplets} label="Humidity" value={t.humidity} unit="%" />
          <StatCard icon={Wind} label="Wind speed" value={t.wind} unit="km/h" />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Panel title="Rainfall trend" subtitle={`Last 7 days · ${scope}`} className="lg:col-span-2" bodyClassName="h-72">
            <RainfallChart data={snap.rainfall} />
          </Panel>
          <Panel title="Flood-risk distribution" subtitle="Districts by risk category">
            <div className="relative h-44">
              <RiskDistributionChart data={snap.distribution} />
              <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
                <div>
                  <p className="font-mono text-2xl font-bold">{t.districtsMonitored}</p>
                  <p className="text-xs text-muted-foreground">districts</p>
                </div>
              </div>
            </div>
            <ul className="mt-4 space-y-2">
              {snap.distribution.map((d) => (
                <li key={d.level} className="flex items-center justify-between text-sm">
                  <RiskBadge level={d.level} />
                  <span className="font-mono font-semibold">{d.value}</span>
                </li>
              ))}
            </ul>
          </Panel>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Panel title="River water levels" subtitle={`Against danger mark · ${scope}`} className="lg:col-span-2" bodyClassName="h-72">
            <RiverChart data={snap.river} />
          </Panel>
          <Panel title="Recent flood alerts" subtitle="Sample alerts for demonstration" bodyClassName="p-0">
            {snap.alerts.length === 0 ? (
              <p className="p-5 text-sm text-muted-foreground">No sample alerts for this district.</p>
            ) : (
              <ul className="divide-y">
                {snap.alerts.map((a) => (
                  <li key={a.id} className="flex gap-3 px-5 py-3.5">
                    <AlertTriangle className="mt-0.5 size-4 shrink-0" style={{ color: RISK_COLOR_VAR[a.level] }} aria-hidden />
                    <div className="min-w-0">
                      <p className="text-sm font-medium leading-snug">{a.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {getDistrict(a.districtId)?.name} · {a.hoursAgo}h ago (sample)
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Panel title="Historical flood events" subtitle={`2010–2024 · illustrative counts · ${scope}`} bodyClassName="h-72">
            <HistoricalChart data={snap.historical} />
          </Panel>
          <Panel title="District-wise risk comparison" subtitle="Model-style risk score, 0–100" bodyClassName="h-[22rem]">
            <RiskComparisonChart data={snap.comparison} highlightId={districtId} />
          </Panel>
        </div>
        <p className="text-xs text-muted-foreground">
          Red bars in the historical chart mark 2010 and 2022, widely reported major flood years in KP. Bar heights are illustrative and not a verified dataset.
        </p>
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
  search: { district?: string };
  dot?: string;
}) {
  return (
    <Link
      to="/dashboard"
      search={search}
      aria-current={active ? "page" : undefined}
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors",
        active ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:border-primary",
      )}
    >
      {dot && <span className="size-2 rounded-full" style={{ background: dot }} aria-hidden />}
      {label}
    </Link>
  );
}
