import { queryOptions } from "@tanstack/react-query";
import { LIVE_STALE_TIME } from "@/lib/api/live-data";
import { getAlerts } from "./alerts.functions";

export const alertsOptions = () =>
  queryOptions({
    queryKey: ["system-alerts"],
    queryFn: () => getAlerts(),
    staleTime: LIVE_STALE_TIME,
    refetchInterval: LIVE_STALE_TIME,
    retry: 1,
  });