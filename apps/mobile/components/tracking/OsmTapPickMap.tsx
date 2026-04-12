import React, { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { WebView } from "react-native-webview";
import type { Region } from "react-native-maps";

type Props = {
  region: Region;
  destination: { latitude: number; longitude: number } | null;
  isDark: boolean;
  backgroundColor: string;
  onPick: (coord: { latitude: number; longitude: number }) => void;
};

function buildHtml(
  region: Region,
  destination: { latitude: number; longitude: number } | null,
  isDark: boolean,
  backgroundColor: string,
) {
  const destJson = JSON.stringify(destination);
  const tileUrl = isDark
    ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png"
    : "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
  const lat = region.latitude;
  const lng = region.longitude;
  const zoom = 14;

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" crossorigin="" />
    <style>
      html, body, #map { height: 100%; margin: 0; background: ${backgroundColor}; }
      .leaflet-control-attribution { font-size: 10px; }
    </style>
  </head>
  <body>
    <div id="map"></div>
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" crossorigin=""></script>
    <script>
      const destination = ${destJson};
      const map = L.map("map", { zoomControl: true, attributionControl: true });
      L.tileLayer("${tileUrl}", { maxZoom: 19, attribution: "© OpenStreetMap" }).addTo(map);
      map.setView([${lat}, ${lng}], ${zoom});
      let marker = null;
      if (destination && destination.latitude && destination.longitude) {
        marker = L.marker([destination.latitude, destination.longitude]).addTo(map);
      }
      map.on("click", function (e) {
        const lat = e.latlng.lat;
        const lng = e.latlng.lng;
        if (marker) { map.removeLayer(marker); }
        marker = L.marker([lat, lng]).addTo(map);
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: "pick", lat, lng }));
        }
      });
    </script>
  </body>
</html>`;
}

/**
 * OpenStreetMap (Leaflet) tap-to-pick — avoids Google Maps SDK on Android when no API key is baked in.
 */
export function OsmTapPickMap({ region, destination, isDark, backgroundColor, onPick }: Props) {
  const html = useMemo(
    () => buildHtml(region, destination, isDark, backgroundColor),
    [region.latitude, region.longitude, region.latitudeDelta, region.longitudeDelta, destination, isDark, backgroundColor],
  );

  return (
    <View style={styles.container}>
      <WebView
        originWhitelist={["*", "https://*", "http://*"]}
        source={{ html }}
        javaScriptEnabled
        domStorageEnabled
        scrollEnabled={false}
        style={styles.webview}
        onMessage={(e) => {
          try {
            const d = JSON.parse(e.nativeEvent.data);
            if (d?.type === "pick" && Number.isFinite(d.lat) && Number.isFinite(d.lng)) {
              onPick({ latitude: d.lat, longitude: d.lng });
            }
          } catch {
            // ignore
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  webview: { flex: 1, backgroundColor: "transparent" },
});
