import { useQuery } from "@tanstack/react-query";
import type { District } from "@/lib/data/districts";
import { fetchLiveData, LIVE_STALE_TIME, type LiveMonitoring } from "./live-data";
import { readFallbackCache, writeFallbackCache } from "./fallback-cache";
import { mergeSnapshot, needsBrowserFallback } from "./snapshot-rules";

export function useMonitoringFallback(
  snapshot: LiveMonitoring,
  districts: District[],
  selectedId?: string,
) {
  const district = districts.find((d) => d.id === selectedId);
  const stored = snapshot.districts.find((d) => d.id === selectedId);
  const missing = Boolean(district && needsBrowserFallback(stored));
  const fallback = useQuery({
    queryKey: ["monitoring-browser-fallback", selectedId],
    enabled: missing,
    staleTime: LIVE_STALE_TIME,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    queryFn: async () => {
      if (!district) throw new Error("No district selected");
      const cached = readFallbackCache(district.id);
      if (cached && Date.now() - Date.parse(cached.savedAt) < LIVE_STALE_TIME) return cached;
      const data = await fetchLiveData(fetch, [district]);
      const row = data.districts[0];
      if (row?.weather || row?.flood) return writeFallbackCache(district.id, data) ?? { savedAt: null, data };
      // Provider failed: reuse the last good device copy (with its age) rather than nothing.
      return cached ?? { savedAt: null, data };
    },
  });
  if (!missing || !fallback.data)
    return { data: snapshot, fallbackLoading: missing && fallback.isFetching };
  const row = fallback.data.data.districts[0];
  return {
    data: {
      ...snapshot,
      origin: "browser" as const,
      browserCachedAt: fallback.data.savedAt,
      districts: snapshot.districts.map((d) =>
        d.id === selectedId && row ? mergeSnapshot(d, row) : d,
      ),
    },
    fallbackLoading: false,
  };
}
