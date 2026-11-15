import {
  RISK_CONFIG,
  assessRisk,
  levelFor,
  median,
  scale,
  type RiskInput,
  type RiskAssessment,
} from "./engine";

export const HORIZONS = [0, 24, 48, 72, 168] as const;
export type Horizon = (typeof HORIZONS)[number];
export type RiskLanguage = "en" | "ur" | "ps";
export const horizonLabel = (h: number) => (h === 0 ? "Now" : h === 168 ? "7 days" : `${h} h`);
const labels = {
  en: {
    low: "Low",
    medium: "Medium",
    high: "High",
    now: "now",
    within: "within",
    hours: "hours",
    rain: "forecast rainfall",
    flow: "peak modelled discharge",
    history: "Historical discharge statistics unavailable; confidence Low.",
    missing: "Not available",
  },
  ur: {
    low: "کم",
    medium: "درمیانہ",
    high: "زیادہ",
    now: "اب",
    within: "کے اندر",
    hours: "گھنٹے",
    rain: "متوقع بارش",
    flow: "ماڈل کے مطابق زیادہ سے زیادہ بہاؤ",
    history: "تاریخی بہاؤ کے اعداد دستیاب نہیں؛ اعتماد کم ہے۔",
    missing: "دستیاب نہیں",
  },
  ps: {
    low: "ټیټ",
    medium: "منځنی",
    high: "لوړ",
    now: "اوس",
    within: "دننه",
    hours: "ساعتونه",
    rain: "اټکل شوی باران",
    flow: "د ماډل تر ټولو لوړ جریان",
    history: "د جریان تاریخي شمېرې نشته؛ باور ټیټ دی.",
    missing: "نه شته",
  },
};
export function translatedReasons(
  r: RiskAssessment,
  horizon: number,
  hasHistory: boolean,
): Record<RiskLanguage, string> {
  return Object.fromEntries(
    Object.entries(labels).map(([lang, t]) => [
      lang,
      `${t[r.level]} ${lang === "en" ? "risk expected" : lang === "ur" ? "خطرہ متوقع ہے" : "خطر اټکل شوی"} ${horizon ? (lang === 'en' ? `within ${horizon} hours` : `${horizon} ${t.hours} ${t.within}`) : t.now}: ${t.rain} (${r.factors.forecastRain72h.value ?? t.missing} mm), ${t.flow} (${r.factors.dischargePeak.value ?? t.missing} m³/s). ${hasHistory ? (lang === 'en' ? r.factors.dischargePeak.detail : lang === 'ur' ? 'بہاؤ کا موازنہ سالانہ زیادہ سے زیادہ تاریخی بہاؤ سے کیا گیا ہے۔' : 'جریان د تاریخي کلني تر ټولو لوړ جریان سره پرتله شوی.') : t.history}`,
    ]),
  ) as Record<RiskLanguage, string>;
}

/** Forecasts anchored to the stored provider time; never slide stale data to the visitor's current time. */
export function assessOutlook(input: RiskInput, horizon: Horizon): RiskAssessment | null {
  const base = assessRisk(input);
  if (!base) return null;
  if (horizon === 0) return base;
  const time = input.weather?.current.time;
  const start = time ? Date.parse(`${time}+05:00`) : NaN;
  const hours =
    input.weather?.hourly.time
      .map((t, i) => ({
        time: Date.parse(`${t}+05:00`),
        rain: input.weather?.hourly.precipitation[i] ?? null,
      }))
      .filter((x) => x.time > start && x.time <= start + horizon * 3600000) ?? [];
  const rain =
    hours.length === horizon && hours.every((x) => x.rain !== null)
      ? Math.round(hours.reduce((s, x) => s + (x.rain ?? 0), 0) * 10) / 10
      : null;
  const daily = input.flood?.daily;
  const today = input.floodUpdatedAt?.slice(0, 10);
  const index = today ? (daily?.time.indexOf(today) ?? -1) : -1;
  const count = Math.ceil(horizon / 24);
  const values = index >= 0 ? (daily?.river_discharge.slice(index, index + count) ?? []) : [];
  const complete = values.length === count && values.every((v) => v !== null);
  const peak = complete ? Math.max(...values.filter((v): v is number => v !== null)) : null;
  const past =
    index >= 0
      ? (daily?.river_discharge
          .slice(Math.max(0, index - 7), index)
          .filter((v): v is number => v !== null) ?? [])
      : [];
  const historical = median(input.historicalAnnualMax.filter((v) => v > 0));
  const reference = historical ?? (past.length ? Math.max(...past) : null);
  const first = values[0];
  const last = values.at(-1);
  const trend =
    complete && first != null && first > 0 && last != null ? (last - first) / first : null;
  const factors = {
    ...base.factors,
    forecastRain72h: {
      ...base.factors.forecastRain72h,
      value: rain,
      score: rain === null ? null : scale(rain, RISK_CONFIG.references.forecastRain72h),
      detail:
        rain === null
          ? "Forecast rainfall not available"
          : `${rain} mm forecast in the next ${horizon} h`,
    },
    dischargePeak: {
      ...base.factors.dischargePeak,
      value: peak,
      score:
        peak === null || reference === null || reference <= 0
          ? null
          : scale(
              peak / reference,
              historical !== null
                ? RISK_CONFIG.references.dischargePeakVsHistory
                : RISK_CONFIG.references.dischargePeakVsOwnRange,
            ),
      detail:
        peak === null
          ? "Discharge forecast not available"
          : `${horizon} h peak ${peak} m³/s vs ${historical !== null ? "median annual maximum" : "past 7-day maximum"} ${reference ?? "Not available"} m³/s`,
    },
    dischargeTrend: {
      ...base.factors.dischargeTrend,
      value: trend === null ? null : Math.round(trend * 100),
      score: trend === null ? null : scale(trend, RISK_CONFIG.references.dischargeTrend),
      detail:
        trend === null
          ? "Discharge trend not available"
          : `${trend >= 0 ? "Rising" : "Falling"} ${Math.abs(Math.round(trend * 100))}% up to ${horizon} h (daily GloFAS)`,
    },
  };
  const available = Object.values(factors).filter((f) => f.score !== null);
  if (!available.length) return null;
  const score =
    Math.round(
      (available.reduce((s, f) => s + (f.score ?? 0) * f.weight, 0) /
        available.reduce((s, f) => s + f.weight, 0)) *
        10,
    ) / 10;
  const result: RiskAssessment = {
    score,
    level: levelFor(score),
    factors,
    confidence: historical !== null && available.length === 4 ? "Medium" : "Low",
    reasonText: "",
  };
  result.reasonText = translatedReasons(result, horizon, historical !== null).en;
  return result;
}
