import { Link } from "@tanstack/react-router";
import { CloudRain, Droplets, Gauge, Thermometer, Waves, Wind } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { DemoBadge, RiskBadge } from "@/components/site/Demo";
import type { District } from "@/lib/data/districts";

export function DistrictDetail({ district }: { district: District }) {
  const d = district.demo;
  const pct = Math.min(100, Math.round((d.riverLevel / d.dangerLevel) * 100));
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-extrabold">{district.name}</h2>
          <p lang="ur" dir="rtl" className="text-muted-foreground">{district.nameUr}</p>
        </div>
        <DemoBadge />
      </div>
      <div className="mt-3 flex items-center gap-3">
        <RiskBadge level={d.riskLevel} />
        <span className="font-mono text-sm text-muted-foreground">Risk score {d.riskScore}/100</span>
      </div>

      <div className="mt-6 rounded-lg border p-4">
        <div className="flex items-center justify-between text-sm">
          <span className="inline-flex items-center gap-2 font-semibold">
            <Waves className="size-4 text-water" aria-hidden /> {district.river}
          </span>
          <span className="font-mono">{d.riverLevel} m / {d.dangerLevel} m</span>
        </div>
        <Progress value={pct} className="mt-3 h-2" aria-label={`River level at ${pct}% of danger mark`} />
        <p className="mt-2 text-xs text-muted-foreground">{pct}% of danger mark (sample value)</p>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3">
        <Metric icon={CloudRain} label="Rainfall (24h)" value={`${d.rainfall24h} mm`} />
        <Metric icon={Thermometer} label="Temperature" value={`${d.temperature} °C`} />
        <Metric icon={Droplets} label="Humidity" value={`${d.humidity}%`} />
        <Metric icon={Wind} label="Wind speed" value={`${d.wind} km/h`} />
      </dl>

      <p className="mt-4 text-xs text-muted-foreground">
        Sample values for demonstration. Live weather (Open-Meteo), river data (GloFAS) and ML risk
        scores are not connected yet.
      </p>

      {district.featured && (
        <Button asChild variant="outline" className="mt-auto pt-2">
          <Link to="/dashboard" search={{ district: district.id }}>
            <Gauge /> Open in dashboard
          </Link>
        </Button>
      )}
    </div>
  );
}

function Metric({ icon: Icon, label, value }: { icon: typeof CloudRain; label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted p-3">
      <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="size-3.5" aria-hidden /> {label}
      </dt>
      <dd className="mt-1 font-mono text-lg font-semibold">{value}</dd>
    </div>
  );
}
