import { describe, expect, it, vi } from "vitest";
import {
  mergeSnapshot,
  retryingMonitoringFetch,
  SNAPSHOT_INTERVAL,
  STALE_SNAPSHOT_AGE,
  needsBrowserFallback,
} from "@/lib/api/snapshot-rules";
import { fetchLiveData, weatherUrl, type LiveDistrict } from "@/lib/api/live-data";
import { DISTRICTS } from "@/lib/data/districts";

describe("Stored monitoring rules", () => {
  it("refreshes at a thirty minute interval", () => expect(SNAPSHOT_INTERVAL).toBe(1800000));
  it("stops on 429 and waits for the next scheduled run", async () => {
    const fetcher = vi
      .fn()
      .mockImplementation(async () => new Response("rate limited", { status: 429 }));
    const pause = vi.fn().mockResolvedValue(undefined);
    const response = await retryingMonitoringFetch(
      fetcher,
      pause,
    )("https://api.open-meteo.com/v1/forecast");
    expect(response.status).toBe(429);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(pause).not.toHaveBeenCalled();
  });
  it("limits transient server failures to three attempts with 2s and 4s backoff", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response("Unavailable", { status: 503 }));
    const pause = vi.fn().mockResolvedValue(undefined);
    expect(
      (await retryingMonitoringFetch(fetcher, pause)("https://api.open-meteo.com/v1/forecast"))
        .status,
    ).toBe(503);
    expect(fetcher).toHaveBeenCalledTimes(3);
    expect(pause.mock.calls).toEqual([[2000], [4000]]);
  });
  it("permits fallback only when missing or strictly older than six hours", () => {
    const row: LiveDistrict = {
      id: "swat",
      weather: null,
      flood: { daily: { time: [], river_discharge: [] } },
      weatherUpdatedAt: null,
      floodUpdatedAt: "2026-11-13T00:00:00Z",
    };
    const fetchedAt = Date.parse(row.floodUpdatedAt ?? "");
    expect(STALE_SNAPSHOT_AGE).toBe(21600000);
    expect(needsBrowserFallback(row, fetchedAt + 21600000)).toBe(false);
    expect(needsBrowserFallback(row, fetchedAt + 21600001)).toBe(true);
    expect(needsBrowserFallback(undefined, fetchedAt)).toBe(true);
  });
  it("supports a paid weather endpoint without exposing its key in diagnostics", async () => {
    const district = DISTRICTS.slice(0, 1);
    const url = weatherUrl(district, {
      baseUrl: "https://customer-api.open-meteo.com",
      apiKey: "test-only-key",
    });
    expect(url.hostname).toBe("customer-api.open-meteo.com");
    expect(url.searchParams.get("apikey")).toBe("test-only-key");
    const result = await fetchLiveData(
      vi.fn().mockResolvedValue(new Response("Unavailable", { status: 503 })),
      district,
      { apiKey: "test-only-key" },
    );
    expect(result.diagnostics?.[0]?.url).not.toContain("apikey");
  });
  it("does not retry a successful provider", async () => {
    const fetcher = vi.fn().mockResolvedValue(Response.json({ ok: true }));
    await retryingMonitoringFetch(fetcher)("https://api.open-meteo.com/v1/forecast");
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("retains the last good weather and its original time if refresh fails", () => {
    const previous: LiveDistrict = {
      id: "swat",
      weather: {
        current: {
          time: "2026-11-10T12:00",
          temperature_2m: 24,
          relative_humidity_2m: null,
          wind_speed_10m: null,
        },
        hourly: { time: [], precipitation: [] },
        daily: { time: [], precipitation_sum: [] },
      },
      flood: null,
      weatherUpdatedAt: "2026-11-10T07:00:00Z",
      floodUpdatedAt: null,
    };
    const next: LiveDistrict = {
      id: "swat",
      weather: null,
      flood: { daily: { time: ["2026-11-10"], river_discharge: [51.6] } },
      weatherUpdatedAt: null,
      floodUpdatedAt: "2026-11-10T07:30:00Z",
      weatherError: "Open-Meteo returned 429",
    };
    const merged = mergeSnapshot(previous, next);
    expect(merged.weather?.current.temperature_2m).toBe(24);
    expect(merged.weatherUpdatedAt).toBe("2026-11-10T07:00:00Z");
    expect(merged.flood?.daily.river_discharge).toEqual([51.6]);
    expect(merged.weatherError).toBe("Open-Meteo returned 429");
  });
  it("browser fallback requests only the selected district, never all coordinates", async () => {
    const district = DISTRICTS.find((d) => d.id === "bannu");
    if (!district) throw new Error("Bannu missing");
    expect(weatherUrl([district]).searchParams.get("latitude")).toBe("32.99");
    expect(weatherUrl([district]).searchParams.get("longitude")).toBe("70.6");
    const fetcher = vi
      .fn()
      .mockResolvedValue(Response.json({ reason: "Unavailable" }, { status: 429 }));
    const result = await fetchLiveData(fetcher, [district]);
    expect(result.districts.map((d) => d.id)).toEqual(["bannu"]);
    expect(result.districts[0]?.weather).toBeNull();
  });
});
