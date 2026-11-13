/** District reference names and approximate headquarters coordinates. */

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
