/**
 * Monitoring data provider. Today it returns the clearly-labelled DEMO dataset.
 * Swap the implementation for Open-Meteo / GloFAS / ML API calls once connected;
 * components only depend on the shapes returned here.
 */
import {
  DISTRICTS,
  DEMO_ALERTS,
  historicalSeries,
  rainfallSeries,
  riskDistribution,
  riverSeries,
  getDistrict,
} from "@/lib/data/districts";

export type DataSource = "demo" | "live";

export function getMonitoringSnapshot(districtId?: string) {
  const district = districtId ? getDistrict(districtId) : undefined;
  const list = district ? [district] : DISTRICTS;
  const avg = (fn: (d: (typeof DISTRICTS)[number]) => number) =>
    +(list.reduce((s, d) => s + fn(d), 0) / list.length).toFixed(1);

  return {
    source: "demo" as DataSource,
    district,
    totals: {
      districtsMonitored: DISTRICTS.length,
      rainfall24h: avg((d) => d.demo.rainfall24h),
      riverLevel: avg((d) => d.demo.riverLevel),
      dangerLevel: avg((d) => d.demo.dangerLevel),
      temperature: avg((d) => d.demo.temperature),
      humidity: avg((d) => d.demo.humidity),
      wind: avg((d) => d.demo.wind),
    },
    rainfall: rainfallSeries(district),
    river: riverSeries(district),
    historical: historicalSeries(district),
    distribution: riskDistribution(),
    comparison: DISTRICTS.map((d) => ({
      id: d.id,
      name: d.name,
      score: d.demo.riskScore,
      level: d.demo.riskLevel,
    })).sort((a, b) => b.score - a.score),
    alerts: district ? DEMO_ALERTS.filter((a) => a.districtId === district.id) : DEMO_ALERTS,
  };
}
