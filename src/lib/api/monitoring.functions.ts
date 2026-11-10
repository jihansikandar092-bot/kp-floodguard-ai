import { createServerFn } from "@tanstack/react-start";
import { fetchLiveData } from "./live-data";

export const getLiveMonitoring = createServerFn({ method: "GET" }).handler(async () => {
  const { cachedMonitoringFetch } = await import("./monitoring-cache.server");
  return fetchLiveData(cachedMonitoringFetch);
});