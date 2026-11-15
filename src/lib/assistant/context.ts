import type { StoredRiskAssessment } from "@/lib/risk/types";
import { partialScoreNote } from "@/lib/risk/partial";
import type { ChatLanguage } from "./chat";

export function compactChatContext(
  risks: StoredRiskAssessment[],
  districts: { id: string; name: string; nameUr?: string; namePs?: string | null }[],
  alerts: {
    district_id: string;
    level: string;
    type: string;
    horizon_hours: number;
    reason_text: string;
    created_at: string;
  }[],
  language: ChatLanguage,
) {
  const horizons = [0, 24, 48, 72, 168];
  const rows = districts.map((d) => ({
    district: d.name,
    district_id: d.id,
    outlook: horizons.map((h) => {
      const r = risks.find((r) => r.districtId === d.id && r.horizonHours === h);
      return r
        ? {
            horizon_hours: h,
            level: r.level,
            score: r.score,
            partial: r.availableFactors < 4,
            available_factors: r.availableFactors,
            partial_note: partialScoreNote(r.availableFactors, language),
            fetched_at: r.snapshotAt,
            computed_at: r.computedAt,
            key_factors: Object.entries(r.factors).map(([key, f]) => ({
              key,
              score: f.score,
              value: f.value,
            })),
          }
        : { horizon_hours: h, available: false };
    }),
  }));
  const times = risks
    .map((r) => r.snapshotAt)
    .filter((t): t is string => Boolean(t))
    .sort();
  return {
    source: "Stored Open-Meteo / GloFAS model-data assessments",
    data_time: times[0] ?? null,
    newest_data_time: times.at(-1) ?? null,
    disclaimer:
      "System-generated from modelled weather and river data. Experimental estimate, not an official warning.",
    districts: rows,
    alerts: alerts
      .slice(0, 24)
      .map((a) => ({
        district: districts.find((d) => d.id === a.district_id)?.name ?? a.district_id,
        level: a.level,
        type: a.type,
        horizon_hours: a.horizon_hours,
        reason: a.reason_text.slice(0, 450),
        created_at: a.created_at,
      })),
    alerts_truncated: alerts.length > 24,
  };
}
