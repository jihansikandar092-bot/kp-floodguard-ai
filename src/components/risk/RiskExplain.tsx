import { ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { FACTOR_LABEL, RISK_CONFIG, type FactorKey } from "@/lib/risk/engine";
import type { StoredRiskAssessment } from "@/lib/risk/types";
import { PartialScoreNote } from "./PartialScoreNote";

export const RISK_DISCLAIMER =
  "System-generated from modelled weather and river data. Experimental estimate, not an official warning.";
const ORDER: FactorKey[] = ["forecastRain72h", "pastRain3d", "dischargePeak", "dischargeTrend"];
const utc = (t: string) => `${t.replace("T", " ").slice(0, 16)} UTC`;

export function WhyRisk({ assessment }: { assessment: StoredRiskAssessment }) {
  return (
    <section aria-labelledby="why-risk" className="mt-4 rounded-lg border p-4">
      <h3 id="why-risk" className="text-sm font-bold">
        Why this risk level?
      </h3>
      <p className="mt-1 text-sm">{assessment.reasonText}</p>
      <dl className="mt-3 space-y-2">
        {ORDER.map((k) => {
          const f = assessment.factors[k];
          return (
            <div key={k}>
              <dt className="flex justify-between text-xs">
                <span>
                  {FACTOR_LABEL[k]} · weight {f.weight}
                </span>
                <span className="font-mono">
                  {f.score === null ? "Not available" : `${f.score}/100`}
                </span>
              </dt>
              <dd className="text-xs text-muted-foreground">{f.detail}</dd>
            </div>
          );
        })}
      </dl>
      <p className="mt-3 text-xs text-muted-foreground">
        Score {assessment.score}/100 · Confidence {assessment.confidence} · Computed{" "}
        {utc(assessment.computedAt)} from stored Open-Meteo / GloFAS snapshot. {RISK_DISCLAIMER}
      </p>
      <PartialScoreNote availableFactors={assessment.availableFactors} />
    </section>
  );
}

export function HowScoreWorks() {
  const r = RISK_CONFIG.references;
  return (
    <Collapsible className="rounded-xl border bg-card shadow-card">
      <CollapsibleTrigger className="group flex w-full items-center justify-between px-5 py-4 text-left font-bold">
        How this score works
        <ChevronDown className="size-4 transition-transform group-data-[state=open]:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-3 px-5 pb-5 text-sm">
        <ul className="list-disc space-y-1 pl-5">
          <li>
            Forecast rainfall, next 72 h — weight {RISK_CONFIG.weights.forecastRain72h}; scaled{" "}
            {r.forecastRain72h.low}–{r.forecastRain72h.high} mm. Source: Open-Meteo.
          </li>
          <li>
            Rainfall, past 3 days — weight {RISK_CONFIG.weights.pastRain3d}; scaled{" "}
            {r.pastRain3d.low}–{r.pastRain3d.high} mm. Source: Open-Meteo.
          </li>
          <li>
            River discharge 7-day forecast peak — weight {RISK_CONFIG.weights.dischargePeak};
            compared with the median of the district&apos;s yearly maxima (historical stats), or,
            when those are missing, with its own past 7-day range (confidence Low). Source: GloFAS
            modelled discharge, not a gauge reading.
          </li>
          <li>
            Discharge trend over the next {RISK_CONFIG.trendDays} days — weight{" "}
            {RISK_CONFIG.weights.dischargeTrend}; scaled {r.dischargeTrend.low * 100}% to +
            {r.dischargeTrend.high * 100}%. Source: GloFAS.
          </li>
        </ul>
        <p>
          Each factor is scored 0–100 and combined by weight. Levels: Low under{" "}
          {RISK_CONFIG.thresholds.medium}, Medium {RISK_CONFIG.thresholds.medium}–
          {RISK_CONFIG.thresholds.high}, High over {RISK_CONFIG.thresholds.high}. Confidence is
          never High.
        </p>
        <p className="font-medium">
          Experimental AI-assisted estimate. Not an official warning. The thresholds have not yet
          been validated against recorded flood events. Follow PDMA, the Pakistan Meteorological
          Department and the Flood Forecasting Division.
        </p>
      </CollapsibleContent>
    </Collapsible>
  );
}
