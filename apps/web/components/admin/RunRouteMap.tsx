"use client";

import { MapContainer, Polyline, TileLayer, useMap, CircleMarker, Tooltip } from "react-leaflet";

type Coord = { latitude: number; longitude: number };

function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  if (points.length >= 2) {
    map.fitBounds(points, { padding: [20, 20], animate: false });
  }
  return null;
}

export function RunRouteMap({ coordinates }: { coordinates: unknown }) {
  const points: [number, number][] = (() => {
    const arr = Array.isArray(coordinates) ? coordinates : [];
    return arr
      .filter(
        (c): c is Coord =>
          c != null &&
          typeof (c as Coord).latitude === "number" &&
          typeof (c as Coord).longitude === "number",
      )
      .map((c) => [c.latitude, c.longitude]);
  })();

  if (points.length < 2) return null;

  const start = points[0];
  const end = points[points.length - 1];

  return (
    <MapContainer
      center={start}
      zoom={14}
      className="h-52 w-full rounded-md"
      zoomControl={false}
      attributionControl={false}
    >
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <FitBounds points={points} />
      <Polyline positions={points} pathOptions={{ color: "#000", weight: 3, opacity: 0.85 }} />
      <CircleMarker
        center={start}
        radius={6}
        pathOptions={{ fillColor: "#22c55e", color: "#fff", weight: 2, fillOpacity: 1 }}
      >
        <Tooltip permanent direction="top" offset={[0, -8]} className="!text-[10px] !font-mono !py-0.5 !px-1.5">
          Start
        </Tooltip>
      </CircleMarker>
      <CircleMarker
        center={end}
        radius={6}
        pathOptions={{ fillColor: "#ef4444", color: "#fff", weight: 2, fillOpacity: 1 }}
      >
        <Tooltip permanent direction="top" offset={[0, -8]} className="!text-[10px] !font-mono !py-0.5 !px-1.5">
          End
        </Tooltip>
      </CircleMarker>
    </MapContainer>
  );
}
