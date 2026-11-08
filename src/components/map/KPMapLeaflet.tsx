import { CircleMarker, MapContainer, TileLayer, Tooltip } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { DISTRICTS, RISK_COLOR_VAR, RISK_LABEL } from "@/lib/data/districts";

export interface KPMapProps {
  selectedId?: string;
  onSelect?: (id: string) => void;
  className?: string;
}

export default function KPMapLeaflet({ selectedId, onSelect, className }: KPMapProps) {
  return (
    <MapContainer
      center={[34.0, 71.9]}
      zoom={7}
      minZoom={6}
      maxZoom={12}
      scrollWheelZoom={false}
      className={className}
      style={{ height: "100%", width: "100%" }}
      attributionControl
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
      />
      {DISTRICTS.map((d) => {
        const selected = d.id === selectedId;
        const radius = d.demo.riskLevel === "high" ? 13 : d.demo.riskLevel === "medium" ? 11 : 9;
        return (
          <CircleMarker
            key={d.id}
            center={[d.lat, d.lng]}
            radius={selected ? radius + 4 : radius}
            pathOptions={{
              color: selected ? "var(--navy-deep)" : "var(--background)",
              weight: selected ? 3.5 : 2,
              fillColor: RISK_COLOR_VAR[d.demo.riskLevel],
              fillOpacity: 0.92,
            }}
            eventHandlers={{ click: () => onSelect?.(d.id) }}
          >
            <Tooltip direction="top" offset={[0, -8]}>
              <strong>{d.name}</strong> · {RISK_LABEL[d.demo.riskLevel]} (demo)
            </Tooltip>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
