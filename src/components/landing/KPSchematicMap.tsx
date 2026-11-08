import { DISTRICTS, RISK_COLOR_VAR } from "@/lib/data/districts";

/** Schematic (not survey-accurate) outline of KP for the hero visual. */
const OUTLINE: [number, number][] = [
  [36.9, 72.4], [36.85, 73.1], [36.4, 73.4], [35.9, 73.6], [35.55, 73.85], [35.15, 74.05],
  [34.8, 73.6], [34.4, 73.5], [34.0, 73.4], [33.75, 73.1], [33.9, 72.6], [33.85, 72.2],
  [33.4, 71.9], [32.9, 71.45], [32.4, 71.3], [31.9, 71.1], [31.3, 70.9], [31.0, 70.5],
  [31.3, 70.0], [31.7, 69.5], [32.2, 69.3], [32.8, 69.5], [33.1, 69.9], [33.6, 69.9],
  [33.95, 70.05], [34.05, 70.5], [34.1, 71.05], [34.4, 71.1], [34.75, 71.3], [35.1, 71.5],
  [35.6, 71.25], [36.0, 71.15], [36.4, 71.6], [36.75, 72.0],
];

const RIVERS: [number, number][][] = [
  [[35.35, 73.3], [35.0, 72.9], [34.6, 72.85], [34.1, 72.75], [33.9, 72.25], [33.2, 71.85], [32.6, 71.4], [31.9, 71.05], [31.2, 70.85]],
  [[35.45, 72.55], [34.95, 72.4], [34.7, 72.2], [34.5, 71.95], [34.15, 71.75], [34.05, 71.7]],
  [[34.05, 71.0], [34.02, 71.6], [34.0, 72.0], [33.9, 72.25]],
  [[36.3, 72.2], [35.85, 71.79], [35.45, 71.6], [35.1, 71.55]],
];

const W = 360;
const H = 480;
const project = (lat: number, lng: number) => ({
  x: ((lng - 69.0) / (74.4 - 69.0)) * W,
  y: ((37.1 - lat) / (37.1 - 30.8)) * H,
});
const path = (pts: [number, number][], close = false) =>
  pts.map(([la, ln], i) => {
    const p = project(la, ln);
    return `${i ? "L" : "M"}${p.x.toFixed(1)},${p.y.toFixed(1)}`;
  }).join(" ") + (close ? " Z" : "");

export function KPSchematicMap() {
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full" role="img" aria-label="Schematic map of Khyber Pakhtunkhwa with demo flood-risk indicators for 12 districts">
      <path d={path(OUTLINE, true)} fill="var(--navy)" stroke="var(--navy-muted)" strokeOpacity="0.5" strokeWidth="1.2" />
      {RIVERS.map((r, i) => (
        <path key={i} d={path(r)} fill="none" stroke="var(--water)" strokeWidth={i === 0 ? 2.4 : 1.6} strokeLinecap="round" strokeLinejoin="round" opacity="0.85" />
      ))}
      {DISTRICTS.map((d) => {
        const p = project(d.lat, d.lng);
        const color = RISK_COLOR_VAR[d.demo.riskLevel];
        const high = d.demo.riskLevel === "high";
        return (
          <g key={d.id} transform={`translate(${p.x} ${p.y})`}>
            {high && (
              <circle r="6" fill={color} className="origin-center animate-pulse-ring" style={{ transformBox: "fill-box" }} />
            )}
            <circle r={high ? 6 : 4.5} fill={color} stroke="var(--navy-deep)" strokeWidth="1.5" />
            {d.featured && (
              <text x="9" y="4" fontSize="11" fontFamily="var(--font-mono)" fill="var(--navy-foreground)" fontWeight="600">
                {d.name}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
