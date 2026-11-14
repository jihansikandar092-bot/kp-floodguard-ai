import { ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import type { KPMapProps } from "./KPMapLeaflet";
import { RISK_COLOR_VAR, RISK_LABEL } from "@/lib/data/districts";

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
  return (
    <ul className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
      {(["low", "medium", "high"] as const).map((l) => (
        <li key={l} className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full" style={{ background: RISK_COLOR_VAR[l] }} />
          {RISK_LABEL[l]}
        </li>
      ))}
      <li className="flex items-center gap-1.5">
        <span className="size-2.5 rounded-full bg-water" /> Not assessed
      </li>
    </ul>
  );
}
