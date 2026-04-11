import React, { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { WebView } from "react-native-webview";

type Coordinate = {
  latitude: number;
  longitude: number;
};

type OsmMapViewProps = {
  coordinates: Coordinate[];
  routeColor: string;
  startColor: string;
  endColor: string;
  backgroundColor: string;
  isDark?: boolean;
  destination?: Coordinate | null;
  activeRegion?: { latitude: number; longitude: number } | null;
};

const buildHtml = (
  coordinates: Coordinate[],
  routeColor: string,
  startColor: string,
  endColor: string,
  backgroundColor: string,
  isDark: boolean,
  destination: Coordinate | null,
  activeRegion: { latitude: number; longitude: number } | null
) => {
  const coordsJson = JSON.stringify(coordinates);
  const destinationJson = JSON.stringify(destination);
  const tileUrl = isDark
    ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png"
    : "https://tile.openstreetmap.org/{z}/{x}/{y}.png";

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link
      rel="stylesheet"
      href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
      integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
      crossorigin=""
    />
    <style>
      html, body, #map {
        height: 100%;
        margin: 0;
        background: ${backgroundColor};
      }
      .leaflet-control-attribution {
        font-size: 10px;
      }
    </style>
  </head>
  <body>
    <div id="map"></div>
    <script
      src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
      integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo="
      crossorigin=""
    ></script>
    <script>
      const coords = ${coordsJson};
      const destination = ${destinationJson};
      const map = L.map("map", {
        zoomControl: false,
        attributionControl: true,
        zoomSnap: 0.5,
      });

      L.tileLayer("${tileUrl}", {
        maxZoom: 19,
        attribution: "© OpenStreetMap contributors",
      }).addTo(map);

      if (coords.length > 0) {
        const latlngs = coords.map(c => [c.latitude, c.longitude]);
        const route = L.polyline(latlngs, { color: "${routeColor}", weight: 4 });
        route.addTo(map);
        map.fitBounds(route.getBounds(), { padding: [24, 24] });

        const first = latlngs[0];
        const last = latlngs[latlngs.length - 1];
        L.circleMarker(first, { radius: 4, color: "${startColor}", fillColor: "${startColor}", fillOpacity: 1 }).addTo(map);
        L.circleMarker(last, { radius: 4, color: "${endColor}", fillColor: "${endColor}", fillOpacity: 1 }).addTo(map);
        if (destination) {
          L.circleMarker([destination.latitude, destination.longitude], { radius: 5, color: "${endColor}", fillColor: "${endColor}", fillOpacity: 1 }).addTo(map);
        }
      } else if (destination) {
        map.setView([destination.latitude, destination.longitude], 15);
        L.circleMarker([destination.latitude, destination.longitude], { radius: 5, color: "${endColor}", fillColor: "${endColor}", fillOpacity: 1 }).addTo(map);
      } else if (activeRegion) {
        map.setView([activeRegion.latitude, activeRegion.longitude], 15);
        L.circleMarker([activeRegion.latitude, activeRegion.longitude], { radius: 5, color: "${startColor}", fillColor: "${startColor}", fillOpacity: 1 }).addTo(map);
      } else {
        map.setView([0, 0], 2);
      }
    </script>
  </body>
</html>`;
};

export function OsmMapView({
  coordinates,
  routeColor,
  startColor,
  endColor,
  backgroundColor,
  isDark = false,
  destination = null,
  activeRegion = null,
}: OsmMapViewProps) {
  const html = useMemo(
    () => buildHtml(coordinates, routeColor, startColor, endColor, backgroundColor, isDark, destination, activeRegion),
    [coordinates, routeColor, startColor, endColor, backgroundColor, isDark, destination, activeRegion]
  );

  return (
    <View style={styles.container}>
      <WebView
        originWhitelist={["*"]}
        source={{ html }}
        javaScriptEnabled
        domStorageEnabled
        scrollEnabled={false}
        style={styles.webview}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  webview: {
    flex: 1,
    backgroundColor: "transparent",
  },
});
