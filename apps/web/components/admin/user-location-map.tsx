"use client";

import { useEffect, useMemo, useRef } from "react";
import maplibregl from "maplibre-gl";

type MapPoint = {
  id: string;
  latitude: number;
  longitude: number;
  label: string;
  updatedAt: string;
  role?: string | null;
  isHistory?: boolean;
};

const SOURCE_ID = "user-location-points";
const LAYER_ID = "user-location-layer";

const DEFAULT_CENTER: [number, number] = [-98.35, 39.5];
const DEFAULT_ZOOM = 2.8;

export function UserLocationMap({
  points,
}: {
  points: MapPoint[];
}) {
  const geoJson = useMemo(
    () => ({
      type: "FeatureCollection",
      features: points.map((point) => ({
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [point.longitude, point.latitude],
        },
        properties: {
          id: point.id,
          label: point.label,
          updatedAt: point.updatedAt,
          role: point.role ?? "",
          isHistory: Boolean(point.isHistory),
        },
      })),
    }),
    [points]
  );

  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const geoJsonRef = useRef(geoJson);

  useEffect(() => {
    geoJsonRef.current = geoJson;
  }, [geoJson]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: {
        version: 8,
        sources: {
          osm: {
            type: "raster",
            tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
            tileSize: 256,
            attribution: "© OpenStreetMap contributors",
          },
        },
        layers: [
          {
            id: "osm-tiles",
            type: "raster",
            source: "osm",
          },
        ],
      },
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      pitch: 45,
      bearing: -12,
      antialias: true,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), "top-right");

    map.on("load", () => {
      map.addSource(SOURCE_ID, {
        type: "geojson",
        data: geoJsonRef.current as any,
      });
      map.addLayer({
        id: LAYER_ID,
        type: "circle",
        source: SOURCE_ID,
        paint: {
          "circle-radius": [
            "case",
            ["boolean", ["get", "isHistory"], false],
            4,
            6,
          ],
          "circle-color": [
            "case",
            ["boolean", ["get", "isHistory"], false],
            "rgba(44, 119, 146, 0.4)",
            "rgba(36, 110, 70, 0.85)",
          ],
          "circle-stroke-width": 1,
          "circle-stroke-color": "rgba(255, 255, 255, 0.75)",
        },
      });

      map.on("mouseenter", LAYER_ID, () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", LAYER_ID, () => {
        map.getCanvas().style.cursor = "";
      });
      map.on("click", LAYER_ID, (event) => {
        const feature = event.features?.[0];
        if (!feature || !feature.geometry || feature.geometry.type !== "Point") return;
        const [lng, lat] = feature.geometry.coordinates as [number, number];
        const label = String(feature.properties?.label ?? "User");
        const updatedAt = feature.properties?.updatedAt
          ? new Date(String(feature.properties.updatedAt)).toLocaleString()
          : "Unknown";
        const role = feature.properties?.role ? ` · ${feature.properties.role}` : "";

        new maplibregl.Popup({ closeButton: true, closeOnClick: true })
          .setLngLat([lng, lat])
          .setHTML(
            `<div style="font-family: ui-sans-serif, system-ui; font-size: 12px;">
              <div style="font-weight: 600; margin-bottom: 4px;">${label}${role}</div>
              <div style="color: #4b5563;">Updated ${updatedAt}</div>
            </div>`
          )
          .addTo(map);
      });

      mapRef.current = map;
    });

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const source = map.getSource(SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
    if (source) {
      source.setData(geoJson as any);
    }

    if (points.length === 0) {
      map.easeTo({ center: DEFAULT_CENTER, zoom: DEFAULT_ZOOM, pitch: 45, bearing: -12, duration: 600 });
      return;
    }

    if (points.length === 1) {
      map.easeTo({
        center: [points[0].longitude, points[0].latitude],
        zoom: 5.5,
        duration: 700,
      });
      return;
    }

    const bounds = new maplibregl.LngLatBounds();
    points.forEach((point) => bounds.extend([point.longitude, point.latitude]));
    map.fitBounds(bounds, { padding: 60, duration: 700, maxZoom: 8 });
  }, [geoJson, points]);

  return <div ref={containerRef} className="h-[360px] w-full rounded-2xl overflow-hidden border border-border" />;
}
