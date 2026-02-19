"use client";

import { useEffect, useMemo } from "react";
import { CircleMarker, MapContainer, Popup, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";

type MapPoint = {
  id: string;
  latitude: number;
  longitude: number;
  label: string;
  updatedAt: string;
  role?: string | null;
  isHistory?: boolean;
};

const DEFAULT_CENTER: [number, number] = [-98.35, 39.5];
const DEFAULT_ZOOM = 3;

function MapUpdater({ points }: { points: MapPoint[] }) {
  const map = useMap();

  useEffect(() => {
    if (!points.length) {
      map.setView(DEFAULT_CENTER, DEFAULT_ZOOM, { animate: true });
      return;
    }

    if (points.length === 1) {
      map.setView([points[0].latitude, points[0].longitude], 5.5, { animate: true });
      return;
    }

    const bounds = new L.LatLngBounds(points.map((point) => [point.latitude, point.longitude]));
    map.fitBounds(bounds, { padding: [60, 60], maxZoom: 8, animate: true });
  }, [map, points]);

  return null;
}

export function UserLocationMap({
  points,
}: {
  points: MapPoint[];
}) {
  const markers = useMemo(
    () =>
      points.map((point) => ({
        ...point,
        isHistory: Boolean(point.isHistory),
      })),
    [points]
  );

  return (
    <div className="h-[360px] w-full rounded-2xl overflow-hidden border border-border">
      <MapContainer
        center={DEFAULT_CENTER}
        zoom={DEFAULT_ZOOM}
        scrollWheelZoom={false}
        className="h-full w-full"
      >
        <TileLayer
          attribution="© OpenStreetMap contributors"
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapUpdater points={markers} />
        {markers.map((point) => {
          const isHistory = point.isHistory;
          const color = isHistory ? "rgba(44, 119, 146, 0.45)" : "rgba(36, 110, 70, 0.9)";
          const radius = isHistory ? 4 : 6;
          const updatedAt = point.updatedAt
            ? new Date(String(point.updatedAt)).toLocaleString()
            : "Unknown";
          const role = point.role ? ` · ${point.role}` : "";
          return (
            <CircleMarker
              key={point.id}
              center={[point.latitude, point.longitude]}
              radius={radius}
              pathOptions={{
                color: "rgba(255, 255, 255, 0.85)",
                weight: 1,
                fillColor: color,
                fillOpacity: 1,
              }}
            >
              <Popup>
                <div style={{ fontFamily: "ui-sans-serif, system-ui", fontSize: 12 }}>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>
                    {point.label ?? "User"}
                    {role}
                  </div>
                  <div style={{ color: "#4b5563" }}>Updated {updatedAt}</div>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}
