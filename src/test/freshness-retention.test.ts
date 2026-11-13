import { describe, expect, it } from "vitest";
import { freshness, mergeSnapshot } from "@/lib/api/snapshot-rules";
import { readFallbackCache, writeFallbackCache } from "@/lib/api/fallback-cache";
import type { LiveDistrict, LiveMonitoring } from "@/lib/api/live-data";

const now = Date.parse("2026-11-13T12:00:00Z");
const ago = (min: number) => new Date(now - min * 60000).toISOString();

describe("freshness labels", () => {
  it("under 1 hour is Live", () => {
    expect(freshness(ago(59), now)).toEqual({ level: "live", label: "Live" });
  });
  it("1 to 3 hours is Delayed with hours", () => {
    expect(freshness(ago(60), now)).toEqual({ level: "delayed", label: "Delayed (1 h)" });
    expect(freshness(ago(180), now)).toEqual({ level: "delayed", label: "Delayed (3 h)" });
  });
  it("over 3 hours is Outdated", () => {
    expect(freshness(ago(181), now).level).toBe("outdated");
  });
  it("missing time is Not available", () => {
    expect(freshness("", now).label).toBe("Not available");
  });
});

const weather = (temp: number | null, humidity: number | null) => ({
  current: {
    time: "2026-11-13T12:00",
    temperature_2m: temp,
    relative_humidity_2m: humidity,
    wind_speed_10m: 3,
  },
  hourly: { time: [], precipitation: [] },
  daily: { time: [], precipitation_sum: [] },
});

describe("metric-level retention", () => {
  it("keeps only the failed metric's last good value and names it", () => {
    const previous: LiveDistrict = {
      id: "swat",
      weather: weather(15, 40),
      flood: null,
      weatherUpdatedAt: "2026-11-13T07:00:00Z",
      floodUpdatedAt: null,
    };
    const next: LiveDistrict = {
      id: "swat",
      weather: weather(18, null),
      flood: null,
      weatherUpdatedAt: "2026-11-13T07:30:00Z",
      floodUpdatedAt: null,
    };
    const merged = mergeSnapshot(previous, next);
    expect(merged.weather?.current.temperature_2m).toBe(18);
    expect(merged.weather?.current.relative_humidity_2m).toBe(40);
    expect(merged.retainedMetrics).toEqual([{ metric: "humidity", since: "2026-11-13T07:00:00Z" }]);
  });
  it("names river discharge when only GloFAS fails", () => {
    const previous: LiveDistrict = {
      id: "bannu",
      weather: weather(20, 50),
      flood: { daily: { time: ["2026-11-13"], river_discharge: [21.2] } },
      weatherUpdatedAt: "2026-11-13T07:00:00Z",
      floodUpdatedAt: "2026-11-13T07:00:00Z",
    };
    const merged = mergeSnapshot(previous, {
      ...previous,
      flood: null,
      floodUpdatedAt: null,
      weatherUpdatedAt: "2026-11-13T08:00:00Z",
    });
    expect(merged.flood?.daily.river_discharge).toEqual([21.2]);
    expect(merged.retainedMetrics?.map((m) => m.metric)).toEqual(["river discharge"]);
  });
});

describe("browser fallback device cache", () => {
  const data: LiveMonitoring = { districts: [], fetchedAt: "2026-11-13T12:00:00Z" };
  it("stores and reads a copy with its saved time", () => {
    localStorage.clear();
    const saved = writeFallbackCache("swat", data);
    expect(readFallbackCache("swat")?.savedAt).toBe(saved?.savedAt);
  });
  it("ignores corrupt entries and storage errors", () => {
    localStorage.setItem("kpfg:fallback:swat", "{bad");
    expect(readFallbackCache("swat")).toBeNull();
    const broken = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("full");
      },
    } as unknown as Storage;
    expect(readFallbackCache("swat", broken)).toBeNull();
    expect(writeFallbackCache("swat", data, broken)).toBeNull();
  });
});
