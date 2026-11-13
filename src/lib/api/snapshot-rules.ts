import type { LiveDistrict } from "./live-data";

export const SNAPSHOT_INTERVAL = 30 * 60 * 1000;
export const STALE_SNAPSHOT_AGE = 6 * 60 * 60 * 1000;
export function needsBrowserFallback(row: LiveDistrict | undefined, now = Date.now()) {
  if (!row?.weather && !row?.flood) return true;
  const times = [row.weatherUpdatedAt, row.floodUpdatedAt].filter((t): t is string => Boolean(t));
  return times.length === 0 || times.every((t) => now - Date.parse(t) > STALE_SNAPSHOT_AGE);
}
export function mergeSnapshot(
  previous: LiveDistrict | undefined,
  next: LiveDistrict,
): LiveDistrict {
  return {
    ...next,
    weather: next.weather ?? previous?.weather ?? null,
    flood: next.flood ?? previous?.flood ?? null,
    weatherUpdatedAt: next.weather ? next.weatherUpdatedAt : (previous?.weatherUpdatedAt ?? null),
    floodUpdatedAt: next.flood ? next.floodUpdatedAt : (previous?.floodUpdatedAt ?? null),
  };
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
