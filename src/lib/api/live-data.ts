import { z } from "zod";
import { DISTRICTS } from "@/lib/data/districts";

export const LIVE_STALE_TIME = 15 * 60 * 1000;
const metric = z.number().finite().nullable().optional().transform(v => v ?? null);
const values = z.array(z.number().finite().nullable());
const dailySchema = z.object({ time: z.array(z.string()).default([]), precipitation_sum: values.default([]) });
const weatherSchema = z.object({
  current: z.object({ time: z.string().default(""), temperature_2m: metric, relative_humidity_2m: metric, wind_speed_10m: metric }).default({}),
  hourly: z.object({ time: z.array(z.string()).default([]), precipitation: values.default([]) }).default({}),
  daily: dailySchema.default({}),
});
const floodSchema = z.object({ daily: z.object({ time: z.array(z.string()), river_discharge: values }) });

export type WeatherData = z.infer<typeof weatherSchema>;
export type FloodData = z.infer<typeof floodSchema>;
export interface LiveDistrict {
  id: string;
  weather: WeatherData | null;
  flood: FloodData | null;
  weatherUpdatedAt: string | null;
  floodUpdatedAt: string | null;
  weatherError?: string | null;
  floodError?: string | null;
}
export interface RequestDiagnostic { source: string; url: string; status: number | null; bodyPreview: string; error: string | null; cached: boolean }
export interface LiveMonitoring { districts: LiveDistrict[]; fetchedAt: string; diagnostics?: RequestDiagnostic[] }

export function weatherUrl() {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.search = new URLSearchParams({
    latitude: DISTRICTS.map(d => d.lat).join(","), longitude: DISTRICTS.map(d => d.lng).join(","),
    current: "temperature_2m,relative_humidity_2m,wind_speed_10m",
    hourly: "precipitation,temperature_2m,relative_humidity_2m,wind_speed_10m",
    daily: "precipitation_sum", past_days: "3", forecast_days: "7", timezone: "Asia/Karachi",
  }).toString();
  return url;
}
export function floodUrl() {
  const url = new URL("https://flood-api.open-meteo.com/v1/flood");
  url.search = new URLSearchParams({ latitude: DISTRICTS.map(d => d.lat).join(","), longitude: DISTRICTS.map(d => d.lng).join(","), daily: "river_discharge", past_days: "7", forecast_days: "7" }).toString();
  return url;
}

// Public, fixed-coordinate reads only. No credentials, user input, or Node APIs.
export async function fetchLiveData(fetcher: typeof fetch = fetch): Promise<LiveMonitoring> {
  const diagnostics: RequestDiagnostic[] = [];
  async function request(url: URL, source: string): Promise<{ values: unknown[]; error: string | null; updatedAt: string | null }> {
    const diagnostic: RequestDiagnostic = { source, url: url.toString(), status: null, bodyPreview: "", error: null, cached: false };
    diagnostics.push(diagnostic);
    try {
      const response = await fetcher(url, { signal: AbortSignal.timeout(20000) });
      diagnostic.status = response.status;
      diagnostic.cached = response.headers.get("x-monitoring-cache") === "hit";
      const body = await response.text();
      diagnostic.bodyPreview = body.slice(0, 300);
      console.info("Monitoring response", JSON.stringify(diagnostic));
      if (!response.ok) {
        let reason = "";
        try { const parsed = JSON.parse(body); if (typeof parsed.reason === "string") reason = `: ${parsed.reason.slice(0, 180)}`; } catch { /* Non-JSON provider error */ }
        throw new Error(`${source} returned ${response.status}${reason}`);
      }
      const json: unknown = JSON.parse(body);
      return { values: Array.isArray(json) ? json : [json], error: null, updatedAt: response.headers.get("x-monitoring-updated-at") ?? new Date().toISOString() };
    } catch (error) {
      diagnostic.error = error instanceof Error ? `${source}: ${error.message}` : `${source}: fetch failed`;
      console.error("Monitoring request failed", JSON.stringify(diagnostic));
      return { values: [], error: diagnostic.error, updatedAt: null };
    }
  }
  const [weather, flood] = await Promise.all([request(weatherUrl(), "Open-Meteo"), request(floodUrl(), "GloFAS")]);
  const fetchedAt = new Date().toISOString();
  return { fetchedAt, diagnostics, districts: DISTRICTS.map((d, index) => {
    const w = weatherSchema.safeParse(weather.values[index]);
    const f = floodSchema.safeParse(flood.values[index]);
    const weatherError = weather.error ?? (w.success ? null : `Open-Meteo: ${d.name} data invalid or missing (${w.error.issues.map(i => i.path.join(".")).join(", ")})`);
    const floodError = flood.error ?? (f.success ? null : `GloFAS: ${d.name} data invalid or missing (${f.error.issues.map(i => i.path.join(".")).join(", ")})`);
    if (weatherError || floodError) console.warn("District monitoring unavailable", d.id, weatherError, floodError);
    return { id: d.id, weather: w.success ? w.data : null, flood: f.success ? f.data : null, weatherUpdatedAt: w.success ? weather.updatedAt : null, floodUpdatedAt: f.success ? flood.updatedAt : null, weatherError, floodError };
  }) };
}

export const mean = (values: (number | null)[]) => values.length && values.every(v => v !== null)
  ? Math.round(values.reduce<number>((sum, value) => sum + (value ?? 0), 0) / values.length * 10) / 10 : null;

export function rainfall24h(weather: WeatherData | null): number | null {
  if (!weather) return null;
  const now = Date.parse(`${weather.current.time}+05:00`);
  const hours = weather.hourly.time.map((time, index) => ({ time: Date.parse(`${time}+05:00`), value: weather.hourly.precipitation[index] ?? null }))
    .filter(h => h.time > now - 86400000 && h.time <= now);
  if (hours.length !== 24 || hours.some(h => h.value === null)) return null;
  return Math.round(hours.reduce((sum, h) => sum + (h.value ?? 0), 0) * 10) / 10;
}
export function todayDischarge(flood: FloodData | null, fetchedAt: string): number | null {
  const index = flood?.daily.time.indexOf(fetchedAt.slice(0, 10)) ?? -1;
  return index < 0 ? null : flood?.daily.river_discharge[index] ?? null;
}
export function liveSnapshot(data: LiveMonitoring, districtId?: string) {
  const rows = districtId ? data.districts.filter(d => d.id === districtId) : data.districts;
  function series(kind: "rainfall" | "discharge") {
    const dates = [...new Set(rows.flatMap(d => kind === "rainfall" ? d.weather?.daily.time ?? [] : d.flood?.daily.time ?? []))].sort();
    return dates.map(day => ({ day, value: mean(rows.map(d => {
      const daily = kind === "rainfall" ? d.weather?.daily : d.flood?.daily;
      const index = daily?.time.indexOf(day) ?? -1;
      if (!daily || index < 0) return null;
      return "precipitation_sum" in daily ? daily.precipitation_sum[index] ?? null : daily.river_discharge[index] ?? null;
    })) }));
  }
  return {
    rows,
    totals: { rainfall24h: mean(rows.map(d => rainfall24h(d.weather))), discharge: mean(rows.map(d => todayDischarge(d.flood, data.fetchedAt))), temperature: mean(rows.map(d => d.weather?.current.temperature_2m ?? null)), humidity: mean(rows.map(d => d.weather?.current.relative_humidity_2m ?? null)), wind: mean(rows.map(d => d.weather?.current.wind_speed_10m ?? null)) },
    rainfall: series("rainfall").map(d => ({ day: d.day, rainfall: d.value })),
    river: series("discharge").map(d => ({ day: d.day, discharge: d.value })),
  };
}