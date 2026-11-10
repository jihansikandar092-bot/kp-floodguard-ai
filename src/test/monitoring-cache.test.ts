import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });
describe("Server monitoring cache", () => {
  it("reuses successful responses for 15 minutes and retains the original successful timestamp on 429", async () => {
    vi.resetModules();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-10T07:00:00Z"));
    const fetcher = vi.fn().mockResolvedValueOnce(Response.json({ temperature: 24 })).mockResolvedValueOnce(Response.json({ reason: "Too Many Requests" }, { status: 429 }));
    vi.stubGlobal("fetch", fetcher);
    const { cachedMonitoringFetch } = await import("@/lib/api/monitoring-cache.server");
    const first = await cachedMonitoringFetch("https://api.open-meteo.com/v1/forecast?test=cache");
    const second = await cachedMonitoringFetch("https://api.open-meteo.com/v1/forecast?test=cache");
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(second.headers.get("x-monitoring-cache")).toBe("hit");
    vi.advanceTimersByTime(900000);
    const stale = await cachedMonitoringFetch("https://api.open-meteo.com/v1/forecast?test=cache");
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(await stale.json()).toEqual({ temperature: 24 });
    expect(stale.headers.get("x-monitoring-error")).toContain("429");
    expect(stale.headers.get("x-monitoring-updated-at")).toBe(first.headers.get("x-monitoring-updated-at"));
  });
});