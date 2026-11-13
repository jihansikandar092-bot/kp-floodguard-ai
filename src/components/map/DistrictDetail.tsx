import { Link } from "@tanstack/react-router";
import { CloudRain, Droplets, Gauge, Thermometer, Waves, Wind } from "lucide-react";
import { Button } from "@/components/ui/button";
import { rainfall24h, todayDischarge, type LiveDistrict } from "@/lib/api/live-data";

import type { District } from "@/lib/data/districts";

export function DistrictDetail({
  district,
  live,
  fetchedAt,
}: {
  district: District;
  live: LiveDistrict | undefined;
  fetchedAt: string;
}) {
  const w = live?.weather;
  const flow = todayDischarge(live?.flood ?? null, live?.floodUpdatedAt ?? fetchedAt);
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-extrabold">{district.name}</h2>
          <p lang="ur" dir="rtl" className="text-muted-foreground">
            {district.nameUr}
          </p>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <span className="text-sm text-muted-foreground">Flood risk: Not available</span>
      </div>

      <div className="mt-6 rounded-lg border p-4">
        <div className="flex items-center justify-between text-sm">
          <span className="inline-flex items-center gap-2 font-semibold">
            <Waves className="size-4 text-water" aria-hidden /> {district.river}
          </span>
          <span className="font-mono">{flow ?? "Not available"} m³/s</span>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          GloFAS model discharge for today (UTC). Not measured river depth; no verified danger
          threshold.
        </p>
      </div>

      {(live?.weatherError || live?.floodError || !w || flow === null) && (
        <p role="alert" className="mt-3 text-sm text-emergency">
          {live?.weatherError ?? live?.floodError ?? "Data not available for this metric"}
        </p>
      )}
      <dl className="mt-4 grid grid-cols-2 gap-3">
        <Metric
          icon={CloudRain}
          label="Rainfall (24h)"
          value={`${rainfall24h(w ?? null) ?? "Not available"} mm`}
        />
        <Metric
          icon={Thermometer}
          label="Temperature"
          value={`${w?.current.temperature_2m ?? "Not available"} °C`}
        />
        <Metric
          icon={Droplets}
          label="Humidity"
          value={`${w?.current.relative_humidity_2m ?? "Not available"}%`}
        />
        <Metric
          icon={Wind}
          label="Wind speed"
          value={`${w?.current.wind_speed_10m ?? "Not available"} km/h`}
        />
      </dl>

      <p className="mt-4 text-xs text-muted-foreground">
        Source: Open-Meteo / GloFAS. System-generated from modelled weather and river data.
        Experimental estimate, not an official warning.
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

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof CloudRain;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg bg-muted p-3">
      <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="size-3.5" aria-hidden /> {label}
      </dt>
      <dd className="mt-1 font-mono text-lg font-semibold">{value}</dd>
    </div>
  );
}
