import { describe, expect, it } from "vitest";
import { assessRisk, levelFor, median, scale, RISK_CONFIG } from "@/lib/risk/engine";
import type { FloodData, WeatherData } from "@/lib/api/live-data";

// Fixed fixtures for tests only; never shown in the UI.
function weather(pastPerHour: number, futurePerHour: number): WeatherData {
  const time: string[] = [];
  const precipitation: number[] = [];
  const start = Date.parse("2026-01-01T00:00+05:00");
  for (let h = -72; h <= 72; h++) {
    const t = new Date(start + h * 3600000 + 5 * 3600000).toISOString().slice(0, 16);
    time.push(t);
    precipitation.push(h <= 0 ? pastPerHour : futurePerHour);
  }
  return {
    current: {
      time: "2026-01-01T00:00",
      temperature_2m: 10,
      relative_humidity_2m: 50,
      wind_speed_10m: 5,
    },
    hourly: { time, precipitation },
    daily: { time: [], precipitation_sum: [] },
  };
}
const days = Array.from({ length: 14 }, (_, i) => `2026-01-${String(i + 1).padStart(2, "0")}`);
const flood = (values: number[]): FloodData => ({ daily: { time: days, river_discharge: values } });
// index 7 = "today" (2026-01-08)
const rising = flood([100, 100, 100, 100, 100, 100, 100, 100, 120, 140, 160, 170, 180, 190]);

describe("risk engine", () => {
  it("clamps linear scaling to 0–100", () => {
    expect(scale(5, { low: 10, high: 100 })).toBe(0);
    expect(scale(55, { low: 10, high: 100 })).toBe(50);
    expect(scale(500, { low: 10, high: 100 })).toBe(100);
  });
  it("uses the documented weights and thresholds", () => {
    expect(Object.values(RISK_CONFIG.weights).reduce((a, b) => a + b, 0)).toBeCloseTo(1);
    expect(levelFor(34.9)).toBe("low");
    expect(levelFor(35)).toBe("medium");
    expect(levelFor(65)).toBe("medium");
    expect(levelFor(65.1)).toBe("high");
  });
  it("median of yearly maxima", () => {
    expect(median([300, 100, 200])).toBe(200);
    expect(median([100, 200, 300, 400])).toBe(250);
  });
  it("heavy rain and discharge at historical maximum → High, confidence Medium", () => {
    const r = assessRisk({
      weather: weather(1, 2),
      flood: rising,
      floodUpdatedAt: "2026-01-08T00:00:00Z",
      historicalAnnualMax: [150, 190, 250],
    })!;
    expect(r.factors.forecastRain72h.value).toBe(144);
    expect(r.factors.forecastRain72h.score).toBe(100);
    expect(r.factors.pastRain3d.value).toBe(72);
    expect(r.factors.dischargePeak.score).toBe(100); // 190 / 190
    expect(r.factors.dischargeTrend.score).toBe(80); // +40%
    expect(r.score).toBe(85.9);
    expect(r.level).toBe("high");
    expect(r.confidence).toBe("Medium");
    expect(r.reasonText).toMatch(/Heavy rain forecast \(144 mm in 72 h\)/);
  });
  it("no historical stats → own past-7-day range and confidence Low", () => {
    const r = assessRisk({
      weather: weather(0, 0),
      flood: rising,
      floodUpdatedAt: "2026-01-08T00:00:00Z",
      historicalAnnualMax: [],
    })!;
    expect(r.factors.dischargePeak.score).toBe(100); // 190 / 100 past max
    expect(r.confidence).toBe("Low");
    expect(r.reasonText).toMatch(/No historical discharge statistics/);
  });
  it("dry and falling → Low", () => {
    const falling = flood([200, 200, 200, 200, 200, 200, 200, 100, 90, 80, 70, 60, 50, 40]);
    const r = assessRisk({
      weather: weather(0, 0),
      flood: falling,
      floodUpdatedAt: "2026-01-08T00:00:00Z",
      historicalAnnualMax: [400, 500],
    })!;
    expect(r.score).toBe(0);
    expect(r.level).toBe("low");
  });
  it("never outputs High confidence and returns null without data", () => {
    expect(
      assessRisk({ weather: null, flood: null, floodUpdatedAt: null, historicalAnnualMax: [] }),
    ).toBeNull();
    const r = assessRisk({
      weather: weather(1, 2),
      flood: null,
      floodUpdatedAt: null,
      historicalAnnualMax: [1],
    })!;
    expect(r.confidence).toBe("Low");
    expect(r.factors.dischargePeak.score).toBeNull();
  });
});
