import { useState } from "react";
import {
  Area,
  ComposedChart,
  Line,
  Legend,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { HORIZONS, horizonLabel, type RiskLanguage } from "@/lib/risk/outlook";
import type { StoredRiskAssessment } from "@/lib/risk/types";
import { RISK_DISCLAIMER } from "./RiskExplain";
import { RISK_CONFIG } from "@/lib/risk/engine";
import { PartialScoreNote } from "./PartialScoreNote";
import { Link } from "@tanstack/react-router";

export function RiskOutlook({
  risks,
  district,
}: {
  risks: StoredRiskAssessment[];
  district?: string | undefined;
}) {
  const [language, setLanguage] = useState<RiskLanguage>("en");
  const rows = HORIZONS.map((h) => risks.find((r) => r.horizonHours === h));
  const chart = rows
    .filter((r): r is StoredRiskAssessment => Boolean(r))
    .map((r) => ({
      horizon: r.horizonHours,
      rain: r.factors.forecastRain72h.value,
      flow: r.factors.dischargePeak.value,
      score: r.score,
    }));
  return (
    <section aria-label="Risk outlook" className="space-y-4 border-y py-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold">Risk outlook{district ? ` · ${district}` : ""}</h2>
        <select
          aria-label="Outlook language"
          value={language}
          onChange={(e) => setLanguage(e.target.value as RiskLanguage)}
          className="rounded-md border bg-background p-2 text-sm"
        >
          <option value="en">English</option>
          <option value="ur">اردو</option>
          <option value="ps">پښتو</option>
        </select>
      </div>
      {!district ? (
        <p className="text-sm text-muted-foreground">Select a district</p>
      ) : (
        <>
          <div
            className="grid gap-3 sm:grid-cols-5"
            dir={language === "en" ? "ltr" : "rtl"}
            lang={language}
          >
            {HORIZONS.map((h, i) => (
              <div key={h} className="border-l-2 border-border pl-3">
                <h3 className="font-bold">{horizonLabel(h)}</h3>
                {rows[i] ? (
                  <>
                    <p className="mt-1 font-mono text-sm capitalize">
                      {rows[i]?.level} · {rows[i]?.score}/100
                    </p>
                    <PartialScoreNote
                      availableFactors={rows[i]?.availableFactors ?? 0}
                      language={language}
                    />
                    <Link to="/responsible-ai" className="mt-1 block text-xs underline">
                      Responsible AI & Privacy
                    </Link>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {rows[i]?.reasonTemplates[language] ?? rows[i]?.reasonText}
                    </p>
                  </>
                ) : (
                  <p className="text-sm">Not available</p>
                )}
              </div>
            ))}
          </div>
          {chart.length > 0 && (
            <div className="h-72" aria-label="Forecast rainfall, discharge and risk timeline">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chart} margin={{ top: 15, right: 30, bottom: 10, left: 15 }}>
                  <XAxis
                    type="number"
                    dataKey="horizon"
                    domain={[0, 168]}
                    ticks={[0, 24, 48, 72, 168]}
                    tickFormatter={horizonLabel}
                  />
                  <YAxis yAxisId="rain" unit=" mm" />
                  <YAxis yAxisId="flow" orientation="right" unit=" m³/s" />
                  <YAxis yAxisId="risk" domain={[0, 100]} hide />
                  <Legend />
                  <ReferenceArea
                    yAxisId="risk"
                    y1={0}
                    y2={RISK_CONFIG.thresholds.medium}
                    fill="var(--risk-low)"
                    fillOpacity={0.08}
                  />
                  <ReferenceArea
                    yAxisId="risk"
                    y1={RISK_CONFIG.thresholds.medium}
                    y2={RISK_CONFIG.thresholds.high}
                    fill="var(--risk-medium)"
                    fillOpacity={0.08}
                  />
                  <ReferenceArea
                    yAxisId="risk"
                    y1={RISK_CONFIG.thresholds.high}
                    y2={100}
                    fill="var(--risk-high)"
                    fillOpacity={0.08}
                  />
                  <Tooltip />
                  <Area
                    yAxisId="rain"
                    dataKey="rain"
                    name="Cumulative rain (mm)"
                    fill="var(--water)"
                    fillOpacity={0.12}
                    stroke="var(--water)"
                  />
                  <Line
                    yAxisId="flow"
                    dataKey="flow"
                    name="Peak discharge (m³/s)"
                    stroke="var(--primary)"
                  />
                  <Line
                    yAxisId="risk"
                    dataKey="score"
                    name="Risk score (0–100)"
                    stroke="var(--emergency)"
                    strokeDasharray="4 4"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Source: stored Open-Meteo / GloFAS · Snapshot:{" "}
            {rows[0]?.snapshotAt?.replace("T", " ").slice(0, 16) ?? "Not available"} UTC · Now
            preserves the existing assessment; forecasts use daily modelled discharge.
          </p>
        </>
      )}
      <p className="text-xs text-muted-foreground">{RISK_DISCLAIMER}</p>
      <Link to="/responsible-ai" className="block text-xs underline">
        Responsible AI & Privacy
      </Link>
    </section>
  );
}
