/**
 * DEMO dataset for KP FloodGuard AI.
 *
 * Every value in this file is illustrative sample data, NOT a live observation,
 * forecast or verified historical record. Replace via the providers in
 * src/lib/api once Open-Meteo, GloFAS and the ML prediction API are connected.
 * Coordinates are approximate district headquarters locations.
 */

export type RiskLevel = "low" | "medium" | "high";

export interface District {
  id: string;
  name: string;
  nameUr: string;
  lat: number;
  lng: number;
  river: string;
  /** Districts offered as dashboard filters */
  featured: boolean;
  tehsils: string[];
  demo: {
    riskLevel: RiskLevel;
    /** 0–100 model-style score (demo) */
    riskScore: number;
    rainfall24h: number; // mm
    riverLevel: number; // m
    dangerLevel: number; // m
    temperature: number; // °C
    humidity: number; // %
    wind: number; // km/h
  };
}

export const DISTRICTS: District[] = [
  {
    id: "swat",
    name: "Swat",
    nameUr: "سوات",
    lat: 34.77,
    lng: 72.36,
    river: "Swat River",
    featured: true,
    tehsils: ["Babuzai", "Barikot", "Kabal", "Matta", "Khwazakhela", "Bahrain", "Charbagh"],
    demo: { riskLevel: "high", riskScore: 82, rainfall24h: 64, riverLevel: 6.8, dangerLevel: 7.5, temperature: 24, humidity: 86, wind: 14 },
  },
  {
    id: "nowshera",
    name: "Nowshera",
    nameUr: "نوشہرہ",
    lat: 34.015,
    lng: 71.98,
    river: "Kabul River",
    featured: true,
    tehsils: ["Nowshera", "Pabbi", "Jehangira"],
    demo: { riskLevel: "high", riskScore: 76, rainfall24h: 41, riverLevel: 8.9, dangerLevel: 9.6, temperature: 31, humidity: 78, wind: 11 },
  },
  {
    id: "bannu",
    name: "Bannu",
    nameUr: "بنوں",
    lat: 32.99,
    lng: 70.6,
    river: "Kurram River",
    featured: true,
    tehsils: ["Bannu", "Domel", "Miryan"],
    demo: { riskLevel: "medium", riskScore: 54, rainfall24h: 22, riverLevel: 3.4, dangerLevel: 4.6, temperature: 34, humidity: 61, wind: 9 },
  },
  {
    id: "upper-dir",
    name: "Upper Dir",
    nameUr: "اپر دیر",
    lat: 35.21,
    lng: 71.88,
    river: "Panjkora River",
    featured: true,
    tehsils: ["Dir", "Wari", "Sheringal", "Barawal"],
    demo: { riskLevel: "medium", riskScore: 61, rainfall24h: 38, riverLevel: 4.1, dangerLevel: 5.2, temperature: 21, humidity: 82, wind: 16 },
  },
  {
    id: "mardan",
    name: "Mardan",
    nameUr: "مردان",
    lat: 34.2,
    lng: 72.04,
    river: "Kalpani Stream",
    featured: true,
    tehsils: ["Mardan", "Takht Bhai", "Katlang", "Rustam", "Garhi Kapura"],
    demo: { riskLevel: "low", riskScore: 32, rainfall24h: 12, riverLevel: 1.9, dangerLevel: 3.5, temperature: 32, humidity: 64, wind: 8 },
  },
  {
    id: "peshawar",
    name: "Peshawar",
    nameUr: "پشاور",
    lat: 34.01,
    lng: 71.58,
    river: "Kabul River",
    featured: false,
    tehsils: ["Peshawar City", "Mathra", "Badaber", "Chamkani"],
    demo: { riskLevel: "medium", riskScore: 47, rainfall24h: 18, riverLevel: 5.2, dangerLevel: 6.8, temperature: 33, humidity: 58, wind: 10 },
  },
  {
    id: "charsadda",
    name: "Charsadda",
    nameUr: "چارسدہ",
    lat: 34.15,
    lng: 71.73,
    river: "Swat River",
    featured: false,
    tehsils: ["Charsadda", "Tangi", "Shabqadar"],
    demo: { riskLevel: "high", riskScore: 71, rainfall24h: 29, riverLevel: 5.9, dangerLevel: 6.4, temperature: 32, humidity: 72, wind: 9 },
  },
  {
    id: "chitral",
    name: "Lower Chitral",
    nameUr: "چترال",
    lat: 35.85,
    lng: 71.79,
    river: "Chitral River",
    featured: false,
    tehsils: ["Chitral", "Drosh"],
    demo: { riskLevel: "medium", riskScore: 49, rainfall24h: 15, riverLevel: 3.1, dangerLevel: 4.4, temperature: 18, humidity: 55, wind: 19 },
  },
  {
    id: "shangla",
    name: "Shangla",
    nameUr: "شانگلہ",
    lat: 34.88,
    lng: 72.65,
    river: "Indus River",
    featured: false,
    tehsils: ["Alpuri", "Puran", "Bisham", "Chakesar"],
    demo: { riskLevel: "medium", riskScore: 58, rainfall24h: 44, riverLevel: 4.6, dangerLevel: 6.0, temperature: 22, humidity: 80, wind: 12 },
  },
  {
    id: "lower-dir",
    name: "Lower Dir",
    nameUr: "لوئر دیر",
    lat: 34.83,
    lng: 71.84,
    river: "Panjkora River",
    featured: false,
    tehsils: ["Timergara", "Samarbagh", "Adenzai", "Lal Qila"],
    demo: { riskLevel: "low", riskScore: 36, rainfall24h: 20, riverLevel: 2.6, dangerLevel: 4.8, temperature: 26, humidity: 70, wind: 10 },
  },
  {
    id: "mansehra",
    name: "Mansehra",
    nameUr: "مانسہرہ",
    lat: 34.33,
    lng: 73.2,
    river: "Kunhar River",
    featured: false,
    tehsils: ["Mansehra", "Balakot", "Oghi"],
    demo: { riskLevel: "low", riskScore: 29, rainfall24h: 17, riverLevel: 2.2, dangerLevel: 4.2, temperature: 23, humidity: 68, wind: 7 },
  },
  {
    id: "di-khan",
    name: "Dera Ismail Khan",
    nameUr: "ڈیرہ اسماعیل خان",
    lat: 31.83,
    lng: 70.9,
    river: "Indus River",
    featured: false,
    tehsils: ["D.I. Khan", "Paharpur", "Kulachi", "Paroa"],
    demo: { riskLevel: "low", riskScore: 26, rainfall24h: 6, riverLevel: 4.9, dangerLevel: 7.9, temperature: 37, humidity: 44, wind: 13 },
  },
];

export const FEATURED_DISTRICTS = DISTRICTS.filter((d) => d.featured);

export function getDistrict(id: string) {
  return DISTRICTS.find((d) => d.id === id);
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

/* ---------- Deterministic demo series (same output on server and client) ---------- */

function seeded(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

const DAY_LABELS = ["Day −6", "Day −5", "Day −4", "Day −3", "Day −2", "Day −1", "Today"];

export function rainfallSeries(district?: District) {
  const list = district ? [district] : DISTRICTS;
  const rand = seeded(`rain-${district?.id ?? "all"}`);
  return DAY_LABELS.map((day, i) => {
    const base = list.reduce((s, d) => s + d.demo.rainfall24h, 0) / list.length;
    const factor = 0.35 + (i / 6) * 0.65 + (rand() - 0.5) * 0.4;
    return { day, rainfall: Math.max(0, Math.round(base * factor)) };
  });
}

export function riverSeries(district?: District) {
  const list = district ? [district] : DISTRICTS;
  const rand = seeded(`river-${district?.id ?? "all"}`);
  const level = list.reduce((s, d) => s + d.demo.riverLevel, 0) / list.length;
  const danger = list.reduce((s, d) => s + d.demo.dangerLevel, 0) / list.length;
  return DAY_LABELS.map((day, i) => ({
    day,
    level: +(level * (0.72 + (i / 6) * 0.28) + (rand() - 0.5) * 0.3).toFixed(2),
    danger: +danger.toFixed(2),
  }));
}

/** Illustrative yearly event counts — NOT a verified historical dataset. */
export function historicalSeries(district?: District) {
  const rand = seeded(`hist-${district?.id ?? "all"}`);
  const scale = district ? district.demo.riskScore / 100 : 1;
  return Array.from({ length: 15 }, (_, i) => {
    const year = 2010 + i;
    // 2010 and 2022 were widely reported major flood years in KP; emphasised for illustration.
    const major = year === 2010 || year === 2022 ? 3.2 : 1;
    const events = Math.round((2 + rand() * 6) * major * (district ? scale * 1.4 : 2));
    return { year: String(year), events };
  });
}

export function riskDistribution() {
  const counts: Record<RiskLevel, number> = { low: 0, medium: 0, high: 0 };
  DISTRICTS.forEach((d) => counts[d.demo.riskLevel]++);
  return (Object.keys(counts) as RiskLevel[]).map((level) => ({
    level,
    name: RISK_LABEL[level],
    value: counts[level],
  }));
}

export interface DemoAlert {
  id: string;
  districtId: string;
  level: RiskLevel;
  title: string;
  hoursAgo: number;
}

export const DEMO_ALERTS: DemoAlert[] = [
  { id: "a1", districtId: "swat", level: "high", title: "Sample alert: Swat River approaching danger mark near Mingora", hoursAgo: 1 },
  { id: "a2", districtId: "nowshera", level: "high", title: "Sample alert: Kabul River rising along low-lying settlements", hoursAgo: 3 },
  { id: "a3", districtId: "charsadda", level: "high", title: "Sample alert: Heavy upstream inflow expected", hoursAgo: 5 },
  { id: "a4", districtId: "upper-dir", level: "medium", title: "Sample alert: Flash-flood watch for Panjkora tributaries", hoursAgo: 7 },
  { id: "a5", districtId: "bannu", level: "medium", title: "Sample alert: Moderate rainfall over Kurram catchment", hoursAgo: 11 },
  { id: "a6", districtId: "mardan", level: "low", title: "Sample advisory: Drainage channels to be kept clear", hoursAgo: 20 },
];
