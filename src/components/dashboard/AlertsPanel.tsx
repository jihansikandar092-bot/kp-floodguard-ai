import { useQuery } from "@tanstack/react-query";
import { alertsOptions } from "@/lib/alerts/alerts-query";
import { Panel } from "./Panel";
import { RISK_DISCLAIMER } from "@/components/risk/RiskExplain";
import { cn } from "@/lib/utils";
import type { getAlerts } from "@/lib/alerts/alerts.functions";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import type { RiskLanguage } from "@/lib/risk/outlook";
import {
  alertStatusText,
  displayReason,
  isWithdrawn,
  originalReasonLabel,
  technicalDetailsLabel,
  utc,
  withdrawalLabel,
  withdrawalSentence,
} from "@/lib/alerts/alert-display";

type Alert = Awaited<ReturnType<typeof getAlerts>>["active"][number];

export function AlertsPanel({
  districts,
  showAllLink = true,
}: {
  districts: { id: string; name: string }[];
  showAllLink?: boolean;
}) {
  const { data, isPending, isError } = useQuery(alertsOptions());
  const [language, setLanguage] = useState<RiskLanguage>("en");
  return (
    <Panel
      title="Flood alerts"
      subtitle="System-generated from modelled weather and river data. Not an official warning."
    >
      <p className="mb-4 text-xs text-muted-foreground">{RISK_DISCLAIMER}</p>
      <div className="mb-4 flex flex-wrap justify-between gap-3">
        {showAllLink && (
          <Link to="/alerts" className="text-sm text-water underline">
            All alerts
          </Link>
        )}
        <select
          aria-label="Alert language"
          value={language}
          onChange={(e) => setLanguage(e.target.value as RiskLanguage)}
          className="ml-auto rounded-md border bg-background p-1 text-sm"
        >
          <option value="en">English</option>
          <option value="ur">اردو</option>
          <option value="ps">پښتو</option>
        </select>
      </div>
      {isPending ? (
        <p role="status">Loading alerts…</p>
      ) : isError ? (
        <p role="status">Alerts temporarily unavailable</p>
      ) : data ? (
        <div className="space-y-5">
          {!data.active.length && !data.expected.length && (
            <p className="text-sm">No active or expected alerts right now</p>
          )}
          {data.expected.length > 0 && (
            <AlertList
              title="Expected"
              rows={data.expected}
              districts={districts}
              language={language}
            />
          )}
          {data.active.length > 0 && (
            <AlertList
              title="Active alerts"
              rows={data.active}
              districts={districts}
              language={language}
            />
          )}
          {data.recent.length > 0 && (
            <AlertList
              title="Recently resolved"
              rows={data.recent}
              districts={districts}
              language={language}
            />
          )}
        </div>
      ) : null}
      <nav
        aria-label="Official flood warning sources"
        className="mt-5 flex flex-wrap gap-x-4 gap-y-2 border-t pt-4 text-xs text-water"
      >
        <a
          href="https://pdma.gov.pk/"
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          PDMA KP ↗
        </a>
        <a
          href="https://www.pmd.gov.pk/"
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          Pakistan Meteorological Department ↗
        </a>
        <a
          href="https://ffd.pmd.gov.pk/"
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          Flood Forecasting Division ↗
        </a>
      </nav>
    </Panel>
  );
}

function AlertList({
  title,
  rows,
  districts,
  language,
}: {
  title: string;
  rows: Alert[];
  districts: { id: string; name: string }[];
  language: RiskLanguage;
}) {
  const rtl = language !== "en";
  return (
    <section aria-label={title}>
      <h3 className="mb-2 text-sm font-bold">{title}</h3>
      <ul className="divide-y">
        {rows.map((alert) => {
          const withdrawn = isWithdrawn(alert);
          const reason = displayReason(alert, language);
          return (
            <li key={alert.id} className="space-y-1 py-3 first:pt-0">
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm font-semibold">
                <span>
                  {districts.find((d) => d.id === alert.district_id)?.name ?? alert.district_id}
                </span>
                <span
                  className={cn(
                    !withdrawn && "capitalize",
                    withdrawn
                      ? "text-muted-foreground"
                      : alert.level === "high"
                        ? "text-emergency"
                        : "text-risk-medium",
                  )}
                  lang={withdrawn ? language : undefined}
                  dir={withdrawn && rtl ? "rtl" : undefined}
                >
                  {withdrawn ? withdrawalLabel(language) : alert.level}
                </span>
              </div>
              {withdrawn && alert.resolved_at && (
                <p
                  className="text-xs font-semibold text-muted-foreground"
                  lang={language}
                  dir={rtl ? "rtl" : "ltr"}
                >
                  {withdrawalSentence(alert.resolved_at, language)}
                </p>
              )}
              <p className="text-sm" lang={language} dir={rtl ? "rtl" : "ltr"}>
                {withdrawn && `${originalReasonLabel(language)} `}
                {reason}
              </p>
              <p className="text-xs text-muted-foreground">{alertStatusText(alert)}</p>
              {alert.escalated_at && (
                <p className="text-xs text-emergency">Escalated {utc(alert.escalated_at)}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Source: {alert.source} · Updated {utc(alert.updated_at)} · Created{" "}
                <time dateTime={alert.created_at}>{utc(alert.created_at)}</time>
              </p>
              <details className="pt-1">
                <summary className="cursor-pointer text-xs text-muted-foreground">
                  {technicalDetailsLabel(language)}
                </summary>
                <p className="mt-1 text-xs text-muted-foreground">
                  Assessment {alert.risk_assessment_id}
                </p>
              </details>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
