import type { FloodData, WeatherData } from "@/lib/api/live-data";

export type RiskLevel = "low" | "medium" | "high";
export type Confidence = "Low" | "Medium";
export type FactorKey = "forecastRain72h" | "pastRain3d" | "dischargePeak" | "dischargeTrend";

/** All weights, reference values and thresholds live here. Unvalidated against recorded floods. */
export const RISK_CONFIG = {
  weights: { forecastRain72h: 0.3, pastRain3d: 0.15, dischargePeak: 0.35, dischargeTrend: 0.2 },
  // Clamped linear scaling: value <= low → 0, value >= high → 100.
  references: {
    forecastRain72h: { low: 10, high: 100 }, // mm in next 72 h
    pastRain3d: { low: 10, high: 80 }, // mm in past 72 h
    dischargePeakVsHistory: { low: 0.5, high: 1.0 }, // forecast peak ÷ median annual max
    dischargePeakVsOwnRange: { low: 1.0, high: 1.5 }, // forecast peak ÷ past-7-day max
    dischargeTrend: { low: 0, high: 0.5 }, // relative change today → +3 days
  },
  trendDays: 3,
  alerts: { maxHorizonHours: 72, freshHours: 3, lowRunsToResolve: 2 },
  thresholds: { medium: 35, high: 65 }, // Low < 35, Medium 35–65, High > 65
} as const;

export const FACTOR_LABEL: Record<FactorKey, string> = {
  forecastRain72h: "Forecast rainfall (next 72 h)",
  pastRain3d: "Rainfall (past 3 days)",
  dischargePeak: "River discharge forecast peak",
  dischargeTrend: "Discharge trend",
};

export interface RiskFactor {
  score: number | null;
  weight: number;
  value: number | null;
  unit: string;
  detail: string;
}
export interface RiskInput {
  weather: WeatherData | null;
  flood: FloodData | null;
  floodUpdatedAt: string | null;
  /** Yearly maximum discharges for this district (m³/s); empty when unavailable. */
  historicalAnnualMax: number[];
}
export interface RiskAssessment {
  score: number;
  level: RiskLevel;
  confidence: Confidence;
  factors: Record<FactorKey, RiskFactor>;
  reasonText: string;
}

const round1 = (v: number) => Math.round(v * 10) / 10;
export function scale(value: number, ref: { low: number; high: number }) {
  if (ref.high === ref.low) return value >= ref.high ? 100 : 0;
  return Math.round(Math.min(100, Math.max(0, ((value - ref.low) / (ref.high - ref.low)) * 100)));
}
export function median(values: number[]) {
  if (!values.length) return null;
  const s = [...values].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  const middle = s[m];
  if (middle === undefined) return null;
  return s.length % 2 ? middle : ((s[m - 1] ?? middle) + middle) / 2;
}
export function levelFor(score: number): RiskLevel {
  const t = RISK_CONFIG.thresholds;
  return score > t.high ? "high" : score >= t.medium ? "medium" : "low";
}

/** Sum of hourly precipitation in (from, to]; null unless every hour is present. */
function hourlySum(weather: WeatherData, fromOffsetH: number, toOffsetH: number) {
  const now = Date.parse(`${weather.current.time}+05:00`);
  if (Number.isNaN(now)) return null;
  const hours = weather.hourly.time
    .map((t, i) => ({ t: Date.parse(`${t}+05:00`), v: weather.hourly.precipitation[i] ?? null }))
    .filter((h) => h.t > now + fromOffsetH * 3600000 && h.t <= now + toOffsetH * 3600000);
  if (hours.length !== toOffsetH - fromOffsetH || hours.some((h) => h.v === null)) return null;
  return round1(hours.reduce((s, h) => s + (h.v ?? 0), 0));
}

export function assessRisk(input: RiskInput): RiskAssessment | null {
  const { weights, references: ref } = RISK_CONFIG;
  const w = input.weather;
  const forecast = w ? hourlySum(w, 0, 72) : null;
  const past = w ? hourlySum(w, -72, 0) : null;

  const daily = input.flood?.daily;
  const today = input.floodUpdatedAt?.slice(0, 10) ?? "";
  const todayIdx = daily?.time.indexOf(today) ?? -1;
  const at = (i: number) => (daily && i >= 0 ? (daily.river_discharge[i] ?? null) : null);
  const future =
    daily && todayIdx >= 0
      ? daily.river_discharge.slice(todayIdx, todayIdx + 7).filter((v): v is number => v !== null)
      : [];
  const pastFlow =
    daily && todayIdx > 0
      ? daily.river_discharge.slice(0, todayIdx).filter((v): v is number => v !== null)
      : [];
  const peak = future.length ? Math.max(...future) : null;
  const histMedian = median(input.historicalAnnualMax.filter((v) => v > 0));

  let peakFactor: RiskFactor = {
    score: null,
    weight: weights.dischargePeak,
    value: peak,
    unit: "m³/s",
    detail: "Discharge forecast not available",
  };
  if (peak !== null && histMedian !== null) {
    peakFactor = {
      ...peakFactor,
      score: scale(peak / histMedian, ref.dischargePeakVsHistory),
      detail: `7-day peak ${round1(peak)} m³/s vs median annual maximum ${round1(histMedian)} m³/s`,
    };
  } else if (peak !== null && pastFlow.length) {
    const pastMax = Math.max(...pastFlow);
    peakFactor = {
      ...peakFactor,
      score: pastMax > 0 ? scale(peak / pastMax, ref.dischargePeakVsOwnRange) : null,
      detail: `7-day peak ${round1(peak)} m³/s vs past 7-day range ${round1(Math.min(...pastFlow))}–${round1(pastMax)} m³/s (no historical stats)`,
    };
  }

  const t0 = at(todayIdx);
  const t3 = at(todayIdx + RISK_CONFIG.trendDays);
  const change = t0 !== null && t3 !== null && t0 > 0 ? (t3 - t0) / t0 : null;

  const factors: Record<FactorKey, RiskFactor> = {
    forecastRain72h: {
      score: forecast === null ? null : scale(forecast, ref.forecastRain72h),
      weight: weights.forecastRain72h,
      value: forecast,
      unit: "mm",
      detail:
        forecast === null
          ? "Forecast rainfall not available"
          : `${forecast} mm forecast in the next 72 h`,
    },
    pastRain3d: {
      score: past === null ? null : scale(past, ref.pastRain3d),
      weight: weights.pastRain3d,
      value: past,
      unit: "mm",
      detail: past === null ? "Past rainfall not available" : `${past} mm in the past 3 days`,
    },
    dischargePeak: peakFactor,
    dischargeTrend: {
      score: change === null ? null : scale(change, ref.dischargeTrend),
      weight: weights.dischargeTrend,
      value: change === null ? null : Math.round(change * 100),
      unit: "%",
      detail:
        change === null
          ? "Discharge trend not available"
          : `${change >= 0 ? "Rising" : "Falling"} ${Math.abs(Math.round(change * 100))}% over the next ${RISK_CONFIG.trendDays} days`,
    },
  };

  const available = Object.values(factors).filter((f) => f.score !== null);
  if (!available.length) return null;
  const totalWeight = available.reduce((s, f) => s + f.weight, 0);
  const score = round1(available.reduce((s, f) => s + (f.score ?? 0) * f.weight, 0) / totalWeight);
  const complete = available.length === 4;
  const confidence: Confidence = histMedian !== null && complete ? "Medium" : "Low";
  return {
    score,
    level: levelFor(score),
    confidence,
    factors,
    reasonText: reason(factors, histMedian !== null, complete),
  };
}

function reason(f: Record<FactorKey, RiskFactor>, hasHistory: boolean, complete: boolean) {
  const parts: string[] = [];
  const s = (k: FactorKey) => f[k].score ?? 0;
  const rain = f.forecastRain72h.value;
  if (rain !== null)
    parts.push(
      `${s("forecastRain72h") >= 60 ? "Heavy" : s("forecastRain72h") >= 25 ? "Moderate" : "Little"} rain forecast (${rain} mm in 72 h)`,
    );
  if (f.pastRain3d.value !== null && s("pastRain3d") >= 40)
    parts.push(`wet past 3 days (${f.pastRain3d.value} mm)`);
  if (f.dischargePeak.score !== null) {
    const p = s("dischargePeak");
    parts.push(
      hasHistory
        ? `discharge forecast ${p >= 70 ? "near or above" : p >= 30 ? "approaching" : "well below"} the district's historical annual maximum`
        : `discharge forecast ${p >= 70 ? "well above" : p >= 30 ? "above" : "within or close to"} its range over the past 7 days`,
    );
  }
  if (f.dischargeTrend.value !== null)
    parts.push(
      `river flow ${f.dischargeTrend.value >= 0 ? "rising" : "falling"} (${f.dischargeTrend.value}% in ${RISK_CONFIG.trendDays} days)`,
    );
  let text = parts.join(", ").replace(/, ([^,]*)$/, " and $1");
  text = text.charAt(0).toUpperCase() + text.slice(1) + ".";
  if (!complete) text += " Some factors were not available, so the score uses the remaining ones.";
  if (!hasHistory) text += " No historical discharge statistics are available for this district.";
  return text;
}
