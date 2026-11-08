import { ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import type { KPMapProps } from "./KPMapLeaflet";

// Leaflet touches `window` at import time, so load it only in the browser.
const LazyMap = lazy(() => import("./KPMapLeaflet"));

function MapFallback() {
  return (
    <div className="grid h-full w-full place-items-center bg-muted text-sm text-muted-foreground">
      Loading map…
    </div>
  );
}

export function KPMap(props: KPMapProps) {
  return (
    <ClientOnly fallback={<MapFallback />}>
      <Suspense fallback={<MapFallback />}>
        <LazyMap {...props} />
      </Suspense>
    </ClientOnly>
  );
}

export function MapLegend() {
  const items = [
    { level: "low", label: "Low Risk" },
    { level: "medium", label: "Medium Risk" },
    { level: "high", label: "High Risk" },
  ] as const;
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-2 text-xs font-medium" aria-label="Risk legend">
      {items.map((i) => (
        <li key={i.level} className="inline-flex items-center gap-1.5">
          <span className="size-3 rounded-full ring-2 ring-background" style={{ background: `var(--risk-${i.level})` }} aria-hidden />
          {i.label}
        </li>
      ))}
    </ul>
  );
}
