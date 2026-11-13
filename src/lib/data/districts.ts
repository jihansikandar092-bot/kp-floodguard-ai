/** District reference rows come from the `districts` table; this file only adds tehsil/river labels by id. */

export type RiskLevel = "low" | "medium" | "high";

export interface District {
  id: string;
  slug: string;
  name: string;
  nameUr: string;
  namePs: string | null;
  lat: number;
  lng: number;
  region: string | null;
  river: string | null;
  tehsils: string[];
}

export interface DistrictRow {
  id: string;
  slug: string;
  name_en: string;
  name_ur: string;
  name_ps: string | null;
  lat: number;
  lng: number;
  region: string | null;
}

// Administrative sub-division and main river names, keyed by district id.
const DISTRICT_DETAILS: Record<string, { river: string; tehsils: string[] }> = {
  swat: {
    river: "Swat River",
    tehsils: ["Babuzai", "Barikot", "Kabal", "Matta", "Khwazakhela", "Bahrain", "Charbagh"],
  },
  nowshera: { river: "Kabul River", tehsils: ["Nowshera", "Pabbi", "Jehangira"] },
  bannu: { river: "Kurram River", tehsils: ["Bannu", "Domel", "Miryan"] },
  "upper-dir": { river: "Panjkora River", tehsils: ["Dir", "Wari", "Sheringal", "Barawal"] },
  mardan: {
    river: "Kalpani Stream",
    tehsils: ["Mardan", "Takht Bhai", "Katlang", "Rustam", "Garhi Kapura"],
  },
  peshawar: { river: "Kabul River", tehsils: ["Peshawar City", "Mathra", "Badaber", "Chamkani"] },
  charsadda: { river: "Swat River", tehsils: ["Charsadda", "Tangi", "Shabqadar"] },
  chitral: { river: "Chitral River", tehsils: ["Chitral", "Drosh"] },
  shangla: { river: "Indus River", tehsils: ["Alpuri", "Puran", "Bisham", "Chakesar"] },
  "lower-dir": {
    river: "Panjkora River",
    tehsils: ["Timergara", "Samarbagh", "Adenzai", "Lal Qila"],
  },
  mansehra: { river: "Kunhar River", tehsils: ["Mansehra", "Balakot", "Oghi"] },
  "di-khan": { river: "Indus River", tehsils: ["D.I. Khan", "Paharpur", "Kulachi", "Paroa"] },
};

export function toDistrict(row: DistrictRow): District {
  const details = DISTRICT_DETAILS[row.id];
  return {
    id: row.id,
    slug: row.slug,
    name: row.name_en,
    nameUr: row.name_ur,
    namePs: row.name_ps,
    lat: row.lat,
    lng: row.lng,
    region: row.region,
    river: details?.river ?? null,
    tehsils: details?.tehsils ?? [],
  };
}

export const RISK_LABEL: Record<RiskLevel, string> = {
  low: "Low Risk",
  medium: "Medium Risk",
  high: "High Risk",
};

/** CSS custom property per risk level, for SVG / chart fills */
export const RISK_COLOR_VAR: Record<RiskLevel, string> = {
  low: "var(--risk-low)",
  medium: "var(--risk-medium)",
  high: "var(--risk-high)",
};
