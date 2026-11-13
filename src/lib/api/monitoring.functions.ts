import { createServerFn } from "@tanstack/react-start";

export const getLiveMonitoring = createServerFn({ method: "GET" }).handler(async () => {
  const { readMonitoringSnapshots } = await import("./monitoring-snapshots.server");
  return readMonitoringSnapshots();
});
