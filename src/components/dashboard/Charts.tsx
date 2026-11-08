import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { RISK_COLOR_VAR, type RiskLevel } from "@/lib/data/districts";

const axis = { stroke: "var(--muted-foreground)", fontSize: 11, tickLine: false, axisLine: false } as const;
const tooltipStyle = {
  contentStyle: {
    background: "var(--card)",
    border: "1px solid var(--border)",
    borderRadius: 8,
    fontSize: 12,
    boxShadow: "var(--shadow-card-value)",
  },
  labelStyle: { color: "var(--foreground)", fontWeight: 600 },
} as const;

export function RainfallChart({ data }: { data: { day: string; rainfall: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <defs>
          <linearGradient id="rainFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--water)" stopOpacity={0.35} />
            <stop offset="100%" stopColor="var(--water)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="var(--border)" vertical={false} />
        <XAxis dataKey="day" {...axis} />
        <YAxis {...axis} unit=" mm" width={56} />
        <Tooltip {...tooltipStyle} formatter={(v: number) => [`${v} mm`, "Rainfall (demo)"]} />
        <Area type="monotone" dataKey="rainfall" stroke="var(--water)" strokeWidth={2.5} fill="url(#rainFill)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function RiverChart({ data }: { data: { day: string; level: number; danger: number }[] }) {
  const danger = data[0]?.danger ?? 0;
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid stroke="var(--border)" vertical={false} />
        <XAxis dataKey="day" {...axis} />
        <YAxis {...axis} unit=" m" width={52} domain={[0, Math.ceil(danger * 1.15)]} />
        <Tooltip {...tooltipStyle} formatter={(v: number) => [`${v} m`, "River level (demo)"]} />
        <ReferenceLine
          y={danger}
          stroke="var(--emergency)"
          strokeDasharray="5 4"
          label={{ value: `Danger ${danger} m`, position: "insideTopRight", fill: "var(--emergency)", fontSize: 11 }}
        />
        <Line type="monotone" dataKey="level" stroke="var(--navy)" strokeWidth={2.5} dot={{ r: 3, fill: "var(--navy)" }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function HistoricalChart({ data }: { data: { year: string; events: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
        <CartesianGrid stroke="var(--border)" vertical={false} />
        <XAxis dataKey="year" {...axis} interval={1} />
        <YAxis {...axis} allowDecimals={false} />
        <Tooltip {...tooltipStyle} cursor={{ fill: "var(--muted)" }} formatter={(v: number) => [v, "Flood events (illustrative)"]} />
        <Bar dataKey="events" radius={[4, 4, 0, 0]}>
          {data.map((d) => (
            <Cell key={d.year} fill={d.year === "2010" || d.year === "2022" ? "var(--emergency)" : "var(--navy)"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function RiskComparisonChart({
  data,
  highlightId,
}: {
  data: { id: string; name: string; score: number; level: RiskLevel }[];
  highlightId?: string | undefined;
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, left: 8, bottom: 0 }}>
        <CartesianGrid stroke="var(--border)" horizontal={false} />
        <XAxis type="number" domain={[0, 100]} {...axis} />
        <YAxis type="category" dataKey="name" {...axis} width={110} />
        <Tooltip {...tooltipStyle} cursor={{ fill: "var(--muted)" }} formatter={(v: number) => [`${v}/100`, "Risk score (demo)"]} />
        <Bar dataKey="score" radius={[0, 4, 4, 0]} barSize={14}>
          {data.map((d) => (
            <Cell
              key={d.id}
              fill={RISK_COLOR_VAR[d.level]}
              fillOpacity={!highlightId || highlightId === d.id ? 1 : 0.3}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function RiskDistributionChart({ data }: { data: { level: RiskLevel; name: string; value: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Tooltip {...tooltipStyle} formatter={(v: number, n: string) => [`${v} districts`, n]} />
        <Pie data={data} dataKey="value" nameKey="name" innerRadius="58%" outerRadius="88%" paddingAngle={3} stroke="var(--card)" strokeWidth={2}>
          {data.map((d) => (
            <Cell key={d.level} fill={RISK_COLOR_VAR[d.level]} />
          ))}
        </Pie>
      </PieChart>
    </ResponsiveContainer>
  );
}
