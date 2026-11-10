import { queryOptions } from "@tanstack/react-query";
import { getLiveMonitoring } from "./monitoring.functions";
import { LIVE_STALE_TIME } from "./live-data";

export const liveMonitoringOptions = () => queryOptions({
  queryKey: ["live-monitoring"],
  queryFn: () => getLiveMonitoring(),
  staleTime: LIVE_STALE_TIME,
  refetchInterval: LIVE_STALE_TIME,
  retry: 1,
});