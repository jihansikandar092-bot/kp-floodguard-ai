import { useQuery } from "@tanstack/react-query";
import { alertsOptions } from "@/lib/alerts/alerts-query";
import { Panel } from "./Panel";
import { RISK_DISCLAIMER } from "@/components/risk/RiskExplain";
import { cn } from "@/lib/utils";
import type { getAlerts } from "@/lib/alerts/alerts.functions";

type Alert = Awaited<ReturnType<typeof getAlerts>>["active"][number];

const utc = (value: string) => `${value.replace("T", " ").slice(0, 16)} UTC`;

export function AlertsPanel({ districts }: { districts: { id: string; name: string }[] }) {
  const { data, isPending, isError } = useQuery(alertsOptions());
  return (
    <Panel title="Flood alerts" subtitle="System-generated from modelled weather and river data. Not an official warning.">
      <p className="mb-4 text-xs text-muted-foreground">{RISK_DISCLAIMER}</p>
      {isPending ? <p role="status">Loading alerts…</p> : isError ? (
        <p role="status">Alerts temporarily unavailable</p>
      ) : data ? (
        <div className="space-y-5">
          <AlertList title="Active alerts" rows={data.active} districts={districts} empty="No active alerts right now" />
          <AlertList title="Recent alerts" rows={data.recent} districts={districts} empty="No resolved alerts in the last 7 days" />
        </div>
      ) : null}
      <nav aria-label="Official flood warning sources" className="mt-5 flex flex-wrap gap-x-4 gap-y-2 border-t pt-4 text-xs text-water">
        <a href="https://pdma.gov.pk/" target="_blank" rel="noopener noreferrer" className="underline">PDMA KP ↗</a>
        <a href="https://www.pmd.gov.pk/" target="_blank" rel="noopener noreferrer" className="underline">Pakistan Meteorological Department ↗</a>
        <a href="https://ffd.pmd.gov.pk/" target="_blank" rel="noopener noreferrer" className="underline">Flood Forecasting Division ↗</a>
      </nav>
    </Panel>
  );
}

function AlertList({ title, rows, districts, empty }: {
  title: string;
  rows: Alert[];
  districts: { id: string; name: string }[];
  empty: string;
}) {
  return (
    <section aria-label={title}>
      <h3 className="mb-2 text-sm font-bold">{title}</h3>
      {!rows.length ? <p className="text-sm text-muted-foreground">{empty}</p> : (
        <ul className="divide-y">
          {rows.map((alert) => (
            <li key={alert.id} className="space-y-1 py-3 first:pt-0">
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm font-semibold">
                <span>{districts.find((d) => d.id === alert.district_id)?.name ?? alert.district_id}</span>
                <span className={cn("capitalize", alert.level === "high" ? "text-emergency" : "text-risk-medium")}>{alert.level}</span>
              </div>
              <p className="text-sm">{alert.reason_text}</p>
              <p className="text-xs text-muted-foreground">Source: {alert.source} · Created <time dateTime={alert.created_at}>{utc(alert.created_at)}</time></p>
              {alert.resolved_at && <p className="text-xs text-muted-foreground">Resolved <time dateTime={alert.resolved_at}>{utc(alert.resolved_at)}</time></p>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}