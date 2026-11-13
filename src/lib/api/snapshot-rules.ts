import type { LiveDistrict } from "./live-data";

export const SNAPSHOT_INTERVAL = 30 * 60 * 1000;
export const STALE_SNAPSHOT_AGE = 6 * 60 * 60 * 1000;
export function needsBrowserFallback(row: LiveDistrict | undefined, now = Date.now()) {
  if (!row?.weather && !row?.flood) return true;
  const times = [row.weatherUpdatedAt, row.floodUpdatedAt].filter((t): t is string => Boolean(t));
  return times.length === 0 || times.every((t) => now - Date.parse(t) > STALE_SNAPSHOT_AGE);
}
const WEATHER_METRICS = {
  temperature_2m: "temperature",
  relative_humidity_2m: "humidity",
  wind_speed_10m: "wind speed",
} as const;

// Keeps the last good value per metric and records which metrics were retained.
export function mergeSnapshot(
  previous: LiveDistrict | undefined,
  next: LiveDistrict,
): LiveDistrict {
  const retained: { metric: string; since: string | null }[] = [];
  const since = (metric: string, fallback: string | null | undefined) =>
    previous?.retainedMetrics?.find((m) => m.metric === metric)?.since ?? fallback ?? null;
  let weather = next.weather;
  let weatherUpdatedAt = next.weather ? next.weatherUpdatedAt : null;
  if (!next.weather && previous?.weather) {
    weather = previous.weather;
    weatherUpdatedAt = previous.weatherUpdatedAt;
    for (const label of [...Object.values(WEATHER_METRICS), "rainfall"])
      retained.push({ metric: label, since: since(label, previous.weatherUpdatedAt) });
  } else if (next.weather && previous?.weather) {
    const current = { ...next.weather.current };
    for (const [key, label] of Object.entries(WEATHER_METRICS) as [
      keyof typeof WEATHER_METRICS,
      string,
    ][]) {
      if (current[key] === null && previous.weather.current[key] !== null) {
        current[key] = previous.weather.current[key];
        retained.push({ metric: label, since: since(label, previous.weatherUpdatedAt) });
      }
    }
    weather = { ...next.weather, current };
  }
  let flood = next.flood;
  let floodUpdatedAt = next.flood ? next.floodUpdatedAt : null;
  if (!next.flood && previous?.flood) {
    flood = previous.flood;
    floodUpdatedAt = previous.floodUpdatedAt;
    retained.push({
      metric: "river discharge",
      since: since("river discharge", previous.floodUpdatedAt),
    });
  }
  return {
    ...next,
    weather: weather ?? null,
    flood: flood ?? null,
    weatherUpdatedAt,
    floodUpdatedAt,
    retainedMetrics: retained,
  };
}

export type FreshnessLevel = "live" | "delayed" | "outdated" | "unknown";
const HOUR = 60 * 60 * 1000;
// Under 1 h = Live, 1–3 h = Delayed (X h), over 3 h = Outdated.
export function freshness(
  updatedAt: string | null | undefined,
  now = Date.now(),
): { level: FreshnessLevel; label: string } {
  const time = updatedAt ? Date.parse(updatedAt) : NaN;
  if (Number.isNaN(time)) return { level: "unknown", label: "Not available" };
  const age = Math.max(0, now - time);
  if (age < HOUR) return { level: "live", label: "Live" };
  if (age <= 3 * HOUR) return { level: "delayed", label: `Delayed (${Math.floor(age / HOUR)} h)` };
  return { level: "outdated", label: "Outdated" };
}

// Three total tries per source; rate limits wait until the next scheduled run.
export function retryingMonitoringFetch(
  fetcher: typeof fetch = fetch,
  pause = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)),
): typeof fetch {
  return async (input, init) => {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const response = await fetcher(input, { ...init, signal: AbortSignal.timeout(6000) });
        if (attempt === 2 || response.status < 500) return response;
        console.warn("Monitoring retry", response.status, "attempt", attempt + 1);
        await response.body?.cancel();
      } catch (error) {
        if (attempt === 2) throw error;
      }
      await pause(2000 * 2 ** attempt);
    }
    throw new Error("Monitoring retries exhausted");
  };
}
