import { describe, it, expect } from "vitest";
import { assessOutlook, HORIZONS, translatedReasons } from "@/lib/risk/outlook";
import { assessRisk, type RiskInput } from "@/lib/risk/engine";

// Fixed fixtures in tests only, never stored as observations.
const times = Array.from({ length: 241 }, (_, i) =>
  new Date(Date.UTC(2026, 0, 1, i - 72)).toISOString().slice(0, 16),
);
const input: RiskInput = {
  weather: {
    current: {
      time: "2026-01-01T00:00",
      temperature_2m: null,
      relative_humidity_2m: null,
      wind_speed_10m: null,
    },
    hourly: { time: times, precipitation: times.map(() => 1) },
    daily: { time: [], precipitation_sum: [] },
  },
  flood: {
    daily: {
      time: Array.from({ length: 14 }, (_, i) =>
        new Date(Date.UTC(2025, 11, 25 + i)).toISOString().slice(0, 10),
      ),
      river_discharge: [100, 100, 100, 100, 100, 100, 100, 100, 120, 140, 160, 180, 200, 220],
    },
  },
  floodUpdatedAt: "2026-01-01T00:00:00Z",
  historicalAnnualMax: [200],
};
describe("risk outlook horizons", () => {
  it("guards every horizon against low-flow peaks and retains the measured value", () => {
    if (!input.flood) throw new Error("missing flood fixture");
    const tiny = { ...input, historicalAnnualMax: [], flood: { daily: { ...input.flood.daily, river_discharge: input.flood.daily.river_discharge.map(() => 0.03) } } };
    for (const h of HORIZONS) {
      const r = assessOutlook(tiny, h);
      expect(r?.factors.dischargePeak.value).toBe(0.03);
      expect(r?.factors.dischargePeak.score).toBeNull();
      expect(r?.factors.dischargeTrend.score).toBeNull();
      expect(r?.availableFactors).toBe(2);
    }
  });
  it("preserves the existing Now assessment", () => {
    expect(assessOutlook(input, 0)).toEqual(assessRisk(input));
  });
  for (const [h, rain, score] of [
    [24, 24, 18.2],
    [48, 48, 41],
    [72, 72, 64.1],
    [168, 168, 98.4],
  ] as const)
    it(`${h} h uses cumulative rainfall and its horizon score`, () => {
      const r = assessOutlook(input, h);
      expect(r?.factors.forecastRain72h.value).toBe(rain);
      expect(r?.score).toBe(score);
      expect(r?.factors.pastRain3d.value).toBe(72);
    });
  it("missing history forces Low confidence at every horizon", () => {
    for (const h of HORIZONS)
      expect(assessOutlook({ ...input, historicalAnnualMax: [] }, h)?.confidence).toBe("Low");
  });
  it("stores three available factors and preserves renormalisation when 168-hour rain is missing", () => {
    if (!input.weather) throw new Error("weather fixture missing");
    const r = assessOutlook(
      {
        ...input,
        weather: {
          ...input.weather,
          hourly: { time: times.slice(0, 145), precipitation: times.slice(0, 145).map(() => 1) },
        },
      },
      168,
    );
    if (!r) throw new Error("assessment missing");
    expect(r.availableFactors).toBe(3);
    expect(r.factors.forecastRain72h.score).toBeNull();
    expect(r.score).toBe(97.6); // (89×0.15 + 100×0.35 + 100×0.20) / 0.70
    const reasons = translatedReasons(r, 168, true);
    expect(reasons.en).toContain("Partial: based on 3 of 4 factors");
    expect(reasons.ur).toContain("4 میں سے 3");
    expect(reasons.ps).toContain("پر 3 ولاړ");
  });
  it("complete assessments store four available factors", () => {
    expect(assessOutlook(input, 168)?.availableFactors).toBe(4);
  });
  it("generates English, Urdu and Pashto horizon templates", () => {
    const r = assessOutlook(input, 48);
    if (!r) throw new Error("assessment missing");
    const reasons = translatedReasons(r, 48, true);
    expect(reasons.en).toContain("48");
    expect(reasons.ur).toContain("48");
    expect(reasons.ps).toContain("48");
  });
});
