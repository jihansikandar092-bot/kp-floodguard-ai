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
  return <p className="text-xs text-muted-foreground">District monitoring · Risk: Not available</p>;
}
