import { CircleMarker, MapContainer, TileLayer, Tooltip } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { District } from "@/lib/data/districts";

export interface AdminRequestMapProps {
  counts: Record<string, number>;
  districts: District[];
}

/** Leaflet inner map: one marker per district, sized by open request count. */
export default function AdminRequestMapLeaflet({ counts, districts }: AdminRequestMapProps) {
  return (
    <MapContainer
      center={[34.0, 71.9]}
      zoom={7}
      minZoom={6}
      maxZoom={12}
      scrollWheelZoom={false}
      style={{ height: "100%", width: "100%" }}
      attributionControl
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {districts.map((d) => {
        const n = counts[d.id] ?? 0;
        const radius = n === 0 ? 6 : 8 + Math.min(14, n * 3);
        return (
          <CircleMarker
            key={d.id}
            center={[d.lat, d.lng]}
            radius={radius}
            pathOptions={{
              color: n > 0 ? "var(--emergency)" : "var(--muted-foreground)",
              weight: 2,
              fillColor: n > 0 ? "var(--emergency)" : "var(--muted)",
              fillOpacity: n > 0 ? 0.75 : 0.4,
            }}
          >
            <Tooltip direction="top" offset={[0, -radius]} opacity={1}>
              <span>
                {d.name}: {n} open request{n === 1 ? "" : "s"}
              </span>
            </Tooltip>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
