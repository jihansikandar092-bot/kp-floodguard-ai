import { describe, expect, it, vi } from "vitest";
import { mergeSnapshot, retryingMonitoringFetch, SNAPSHOT_INTERVAL } from "@/lib/api/snapshot-rules";
import { fetchLiveData, weatherUrl, type LiveDistrict } from "@/lib/api/live-data";
import { DISTRICTS } from "@/lib/data/districts";

describe("Stored monitoring rules", () => {
  it("refreshes at a thirty minute interval", () => expect(SNAPSHOT_INTERVAL).toBe(1800000));
  it("limits 429 retries to three total tries with exponential backoff", async () => {
    const fetcher = vi.fn().mockImplementation(async () => new Response("rate limited", { status: 429 }));
    const pause = vi.fn().mockResolvedValue(undefined);
    const response = await retryingMonitoringFetch(fetcher, pause)("https://api.open-meteo.com/v1/forecast");
    expect(response.status).toBe(429);
    expect(fetcher).toHaveBeenCalledTimes(3);
    expect(pause.mock.calls).toEqual([[2000], [4000]]);
  });
  it("does not retry a successful provider", async () => {
    const fetcher = vi.fn().mockResolvedValue(Response.json({ ok: true }));
    await retryingMonitoringFetch(fetcher)("https://api.open-meteo.com/v1/forecast");
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("retains the last good weather and its original time if refresh fails", () => {
    const previous: LiveDistrict = { id: "swat", weather: { current: { time: "2026-11-10T12:00", temperature_2m: 24, relative_humidity_2m: null, wind_speed_10m: null }, hourly: { time: [], precipitation: [] }, daily: { time: [], precipitation_sum: [] } }, flood: null, weatherUpdatedAt: "2026-11-10T07:00:00Z", floodUpdatedAt: null };
    const next: LiveDistrict = { id: "swat", weather: null, flood: { daily: { time: ["2026-11-10"], river_discharge: [51.6] } }, weatherUpdatedAt: null, floodUpdatedAt: "2026-11-10T07:30:00Z", weatherError: "Open-Meteo returned 429" };
    const merged = mergeSnapshot(previous, next);
    expect(merged.weather?.current.temperature_2m).toBe(24);
    expect(merged.weatherUpdatedAt).toBe("2026-11-10T07:00:00Z");
    expect(merged.flood?.daily.river_discharge).toEqual([51.6]);
    expect(merged.weatherError).toBe("Open-Meteo returned 429");
  });
  it("browser fallback requests only the selected district, never all coordinates", async () => {
    const district = DISTRICTS.find(d => d.id === "bannu");
    if (!district) throw new Error("Bannu missing");
    expect(weatherUrl([district]).searchParams.get("latitude")).toBe("32.99");
    expect(weatherUrl([district]).searchParams.get("longitude")).toBe("70.6");
    const fetcher = vi.fn().mockResolvedValue(Response.json({ reason: "Unavailable" }, { status: 429 }));
    const result = await fetchLiveData(fetcher, [district]);
    expect(result.districts.map(d => d.id)).toEqual(["bannu"]);
    expect(result.districts[0]?.weather).toBeNull();
  });
});