import { rainfall24h, todayDischarge, type LiveMonitoring } from "@/lib/api/live-data";
import { CircleMarker, MapContainer, TileLayer, Tooltip } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { District } from "@/lib/data/districts";

export interface KPMapProps {
  data: LiveMonitoring;
  districts: District[];
  selectedId?: string | undefined;
  onSelect?: ((id: string) => void) | undefined;
  className?: string | undefined;
}

export default function KPMapLeaflet({
  data,
  districts,
  selectedId,
  onSelect,
  className,
}: KPMapProps) {
  return (
    <MapContainer
      center={[34.0, 71.9]}
      zoom={7}
      minZoom={6}
      maxZoom={12}
      scrollWheelZoom={false}
      {...(className ? { className } : {})}
      style={{ height: "100%", width: "100%" }}
      attributionControl
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {districts.map((d) => {
        const selected = d.id === selectedId;
        const live = data.districts.find((row) => row.id === d.id);
        const rain = rainfall24h(live?.weather ?? null);
        const flow = todayDischarge(live?.flood ?? null, live?.floodUpdatedAt ?? data.fetchedAt);
        const radius = rain === null ? 9 : 9 + Math.min(12, rain / 5);
        return (
          <CircleMarker
            key={d.id}
            center={[d.lat, d.lng]}
            radius={selected ? radius + 4 : radius}
            pathOptions={{
              color: selected ? "var(--navy-deep)" : "var(--background)",
              weight: selected ? 3.5 : 2,
              fillColor: "var(--water)",
              fillOpacity: 0.92,
            }}
            eventHandlers={{ click: () => onSelect?.(d.id) }}
          >
            <Tooltip direction="top" offset={[0, -8]}>
              <strong>{d.name}</strong>
              <br />
              Rainfall (24h): {rain ?? "Not available"} mm
              <br />
              River discharge: {flow ?? "Not available"} m³/s
              <br />
              Risk: Not available
            </Tooltip>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
