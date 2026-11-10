import { useQuery } from "@tanstack/react-query";
import { DISTRICTS } from "@/lib/data/districts";
import { fetchLiveData, LIVE_STALE_TIME, type LiveMonitoring } from "./live-data";

export function useMonitoringFallback(snapshot: LiveMonitoring, selectedId?: string) {
  const district = DISTRICTS.find(d => d.id === selectedId);
  const stored = snapshot.districts.find(d => d.id === selectedId);
  const missing = Boolean(district && !stored?.weather && !stored?.flood);
  const fallback = useQuery({
    queryKey: ["monitoring-browser-fallback", selectedId],
    enabled: missing,
    staleTime: LIVE_STALE_TIME,
    retry: false,
    queryFn: async () => {
      if (!district) throw new Error("No district selected");
      return fetchLiveData(fetch, [district]);
    },
  });
  if (!missing || !fallback.data) return { data: snapshot, fallbackLoading: missing && fallback.isFetching };
  return { data: { ...snapshot, origin: "browser" as const, districts: snapshot.districts.map(d => d.id === selectedId ? fallback.data.districts[0] ?? d : d) }, fallbackLoading: false };
}