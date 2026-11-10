import { describe, expect, it, vi } from "vitest";
import { DISTRICTS } from "@/lib/data/districts";
import { fetchLiveData, floodUrl, weatherUrl, LIVE_STALE_TIME, liveSnapshot, rainfall24h, type WeatherData } from "@/lib/api/live-data";

describe("Live monitoring rules", () => {
  it("uses a 15 minute freshness window", () => expect(LIVE_STALE_TIME).toBe(900000));
  it("requests three past weather days and seven forecast days for every district without keys", () => {
    const url = weatherUrl();
    expect(url.searchParams.get("past_days")).toBe("3");
    expect(url.searchParams.get("forecast_days")).toBe("7");
    expect(url.searchParams.get("latitude")).toBe(DISTRICTS.map(d => d.lat).join(","));
    expect(url.searchParams.get("longitude")).toBe(DISTRICTS.map(d => d.lng).join(","));
    expect(url.searchParams.get("hourly")).toBe("precipitation,temperature_2m,relative_humidity_2m,wind_speed_10m");
    expect(url.searchParams.get("daily")).toBe("precipitation_sum");
    expect(url.searchParams.has("apikey")).toBe(false);
  });
  it("requests seven past and seven forecast river discharge days without keys", () => {
    const url = floodUrl();
    expect(url.searchParams.get("past_days")).toBe("7");
    expect(url.searchParams.get("forecast_days")).toBe("7");
    expect(url.searchParams.get("daily")).toBe("river_discharge");
    expect(url.searchParams.has("apikey")).toBe(false);
  });
  it("never substitutes demo or zero for a failed API", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const data = await fetchLiveData(vi.fn().mockRejectedValue(new Error("offline")));
    expect(data.districts).toHaveLength(DISTRICTS.length);
    expect(data.districts.every(d => d.weather === null && d.flood === null)).toBe(true);
    expect(liveSnapshot(data).totals).toEqual({ rainfall24h: null, discharge: null, temperature: null, humidity: null, wind: null });
    vi.restoreAllMocks();
  });
  it("preserves available weather when the river API fails, including real zero rainfall", async () => {
    const weather: WeatherData = {
      current: { time: "2026-11-10T12:00", temperature_2m: 24, relative_humidity_2m: 28, wind_speed_10m: 5 },
      daily: { time: ["2026-11-10"], precipitation_sum: [0] },
      hourly: { time: [], precipitation: [] },
    };
    const fetcher = vi.fn().mockResolvedValueOnce(Response.json(DISTRICTS.map(() => weather))).mockResolvedValueOnce(new Response("Unavailable", { status: 503 }));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const data = await fetchLiveData(fetcher);
    const snapshot = liveSnapshot(data, "swat");
    expect(snapshot.totals.temperature).toBe(24);
    expect(snapshot.totals.discharge).toBeNull();
    expect(snapshot.rainfall).toEqual([{ day: "2026-11-10", rainfall: 0 }]);
    vi.restoreAllMocks();
  });
  it("calculates past 24-hour rainfall from hourly values and rejects incomplete coverage", () => {
    const weather: WeatherData = {
      current: { time: "2026-11-10T23:45", temperature_2m: 24, relative_humidity_2m: 28, wind_speed_10m: 5 },
      daily: { time: [], precipitation_sum: [] },
      hourly: { time: Array.from({ length: 24 }, (_, hour) => `2026-11-10T${String(hour).padStart(2, "0")}:00`), precipitation: Array(24).fill(2) },
    };
    expect(rainfall24h(weather)).toBe(48);
    weather.hourly.precipitation[3] = null;
    expect(rainfall24h(weather)).toBeNull();
  });
});