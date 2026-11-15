export interface ServiceHealth {
  service: string;
  lastSuccessAt: string | null;
  lastErrorAt: string | null;
  lastErrorText: string | null;
}
export function serviceStatus(health: ServiceHealth | undefined): "Connected" | "Degraded" | "Not connected" {
  if (!health?.lastSuccessAt) return "Not connected";
  return health.lastErrorAt && Date.parse(health.lastErrorAt) >= Date.parse(health.lastSuccessAt)
    ? "Degraded" : "Connected";
}
export const healthTime = (time: string | null | undefined) => time ? `${time.replace("T", " ").slice(0, 16)} UTC` : "Not available";