import React, { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { WebView } from "react-native-webview";

type Coordinate = {
  latitude: number;
  longitude: number;
};

/** Esri World Imagery — satellite, no API key (Leaflet y/x order). */
const TILE_SATELLITE =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";

type OsmMapViewProps = {
  coordinates: Coordinate[];
  routeColor: string;
  startColor: string;
  endColor: string;
  /** Destination pin / line — must differ from `endColor` (live position). */
  destinationColor: string;
  backgroundColor: string;
  destination?: Coordinate | null;
  /** Latest GPS center (live puck); trail points may update less often. */
  activeRegion?: { latitude: number; longitude: number } | null;
};

const buildHtml = (
  coordinates: Coordinate[],
  routeColor: string,
  startColor: string,
  endColor: string,
  destinationColor: string,
  backgroundColor: string,
  destination: Coordinate | null,
  activeRegion: { latitude: number; longitude: number } | null,
) => {
  const coordsJson = JSON.stringify(coordinates);
  const destinationJson = JSON.stringify(destination);
  const activeJson = JSON.stringify(activeRegion);

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
      const activeRegion = ${activeJson};
      const map = L.map("map", {
        zoomControl: false,
        attributionControl: true,
        zoomSnap: 0.5,
      });

      L.tileLayer("${TILE_SATELLITE}", {
        maxZoom: 19,
        attribution: "Imagery © Esri, © OpenStreetMap",
      }).addTo(map);

      function extendBounds(bounds, lat, lng) {
        if (lat != null && lng != null && isFinite(lat) && isFinite(lng)) {
          bounds.extend([lat, lng]);
        }
      }

      if (coords.length > 0) {
        const latlngs = coords.map(c => [c.latitude, c.longitude]);
        const route = L.polyline(latlngs, { color: "${routeColor}", weight: 4 });
        route.addTo(map);

        const first = latlngs[0];
        L.circleMarker(first, {
          radius: 5,
          color: "${startColor}",
          fillColor: "${startColor}",
          fillOpacity: 1,
          weight: 2,
        }).addTo(map);

        const trailEnd = latlngs[latlngs.length - 1];
        const live = activeRegion && isFinite(activeRegion.latitude) && isFinite(activeRegion.longitude)
          ? [activeRegion.latitude, activeRegion.longitude]
          : null;

        if (live) {
          L.circleMarker(live, {
            radius: 6,
            color: "${endColor}",
            fillColor: "${endColor}",
            fillOpacity: 1,
            weight: 2,
          }).addTo(map);
        } else if (latlngs.length > 1) {
          L.circleMarker(trailEnd, {
            radius: 5,
            color: "${endColor}",
            fillColor: "${endColor}",
            fillOpacity: 1,
            weight: 2,
          }).addTo(map);
        }

        const lineFrom = live || trailEnd;
        if (destination && destination.latitude != null && destination.longitude != null) {
          const destLatLng = [destination.latitude, destination.longitude];
          L.circleMarker(destLatLng, {
            radius: 7,
            color: "${destinationColor}",
            fillColor: "${destinationColor}",
            fillOpacity: 1,
            weight: 2,
          }).addTo(map);
          L.polyline([lineFrom, destLatLng], {
            color: "${destinationColor}",
            weight: 3,
            dashArray: "10 8",
            opacity: 0.95,
          }).addTo(map);
        }

        let bounds = route.getBounds();
        if (!bounds.isValid() && latlngs.length === 1) {
          bounds = L.latLngBounds(latlngs[0], latlngs[0]);
        }
        extendBounds(bounds, destination && destination.latitude, destination && destination.longitude);
        if (live) extendBounds(bounds, live[0], live[1]);
        if (bounds.isValid()) {
          map.fitBounds(bounds, { padding: [36, 36], maxZoom: 17 });
        }
      } else if (destination && destination.latitude != null && destination.longitude != null) {
        map.setView([destination.latitude, destination.longitude], 15);
        L.circleMarker([destination.latitude, destination.longitude], {
          radius: 7,
          color: "${destinationColor}",
          fillColor: "${destinationColor}",
          fillOpacity: 1,
          weight: 2,
        }).addTo(map);
      } else if (activeRegion && isFinite(activeRegion.latitude) && isFinite(activeRegion.longitude)) {
        map.setView([activeRegion.latitude, activeRegion.longitude], 15);
        L.circleMarker([activeRegion.latitude, activeRegion.longitude], {
          radius: 6,
          color: "${endColor}",
          fillColor: "${endColor}",
          fillOpacity: 1,
          weight: 2,
        }).addTo(map);
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
  destinationColor,
  backgroundColor,
  destination = null,
  activeRegion = null,
}: OsmMapViewProps) {
  const html = useMemo(
    () =>
      buildHtml(
        coordinates,
        routeColor,
        startColor,
        endColor,
        destinationColor,
        backgroundColor,
        destination,
        activeRegion,
      ),
    [
      coordinates,
      routeColor,
      startColor,
      endColor,
      destinationColor,
      backgroundColor,
      destination,
      activeRegion,
    ],
  );

  return (
    <View style={styles.container}>
      <WebView
        originWhitelist={[
          "https://*.openstreetmap.org",
          "https://*.cartocdn.com",
          "https://server.arcgisonline.com",
          "https://*.arcgisonline.com",
        ]}
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
