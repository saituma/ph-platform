import React, { useEffect, useRef } from "react";
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
  routePolyline?: Coordinate[] | null;
  onRecenter?: () => void;
  followUser?: boolean;
  isDark?: boolean;
  splitPoints?: any[];
};

const buildHtml = (
  routeColor: string,
  startColor: string,
  endColor: string,
  destinationColor: string,
  backgroundColor: string,
  isDark: boolean
) => {
  const tileUrl = isDark
    ? "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
    : "https://tile.openstreetmap.org/{z}/{x}/{y}.png";

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
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
      #recenter-btn {
        position: absolute;
        top: 10px;
        right: 10px;
        z-index: 1000;
        background: ${backgroundColor};
        border: 1px solid rgba(0,0,0,0.2);
        padding: 8px 12px;
        border-radius: 8px;
        cursor: pointer;
        display: none;
        color: ${isDark ? "#fff" : "#000"};
        font-weight: bold;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      }
    </style>
  </head>
  <body>
    <div id="map"></div>
    <button id="recenter-btn">Recenter</button>
    <script
      src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
      integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo="
      crossorigin=""
    ></script>
    <script>
      const map = L.map("map", {
        zoomControl: false,
        attributionControl: true,
        zoomSnap: 0.5,
        dragging: true,
        touchZoom: true,
        scrollWheelZoom: false
      });

      L.tileLayer("${TILE_SATELLITE}", {
        maxZoom: 19,
        attribution: "© OSM / Esri",
      }).addTo(map);

      function extendBounds(bounds, lat, lng) {
        if (lat != null && lng != null && isFinite(lat) && isFinite(lng)) {
          bounds.extend([lat, lng]);
        }
      }

      document.getElementById("recenter-btn").onclick = () => {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: "recenter" }));
      };

      window.routeLayer = L.polyline([], { color: "${endColor}", weight: 4, dashArray: "10 8", opacity: 0.8 }).addTo(map);
      window.trailLayer = L.polyline([], { color: "${routeColor}", weight: 4 }).addTo(map);
      window.startDot = L.circleMarker([0, 0], { radius: 4, color: "${startColor}", fillColor: "${startColor}", fillOpacity: 1 });
      window.liveDot = L.circleMarker([0, 0], { radius: 6, color: "${endColor}", fillColor: "${endColor}", fillOpacity: 1 });
      window.destMarker = null;

      let hasInitializedBounds = false;

      window.recenterMap = function(lat, lng) {
        map.panTo([lat, lng]);
      };

      window.updateMap = function(trailCoords, activePos, routeCoords, destination) {
        if (!hasInitializedBounds && trailCoords.length === 0 && !activePos && !destination) {
          map.setView([0, 0], 2);
          return;
        }

        if (trailCoords && trailCoords.length > 0) {
          const latLngs = trailCoords.map(c => [c.latitude, c.longitude]);
          window.trailLayer.setLatLngs(latLngs);
          
          if (!map.hasLayer(window.startDot)) {
             window.startDot.setLatLng(latLngs[0]).addTo(map);
          }
        }

        if (routeCoords && routeCoords.length > 0) {
          window.routeLayer.setLatLngs(routeCoords.map(c => [c.latitude, c.longitude]));
          window.routeLayer.setStyle({ dashArray: null, opacity: 0.5 });
        } else if (destination && trailCoords && trailCoords.length > 0) {
          const lastC = trailCoords[trailCoords.length - 1];
          window.routeLayer.setLatLngs([[lastC.latitude, lastC.longitude], [destination.latitude, destination.longitude]]);
          window.routeLayer.setStyle({ dashArray: "10 8", opacity: 0.8 });
        } else {
          window.routeLayer.setLatLngs([]);
        }

        if (destination) {
          if (!window.destMarker) {
             window.destMarker = L.circleMarker([destination.latitude, destination.longitude], { radius: 6, color: "${endColor}", fillColor: "${endColor}", fillOpacity: 1 }).addTo(map);
          } else {
             window.destMarker.setLatLng([destination.latitude, destination.longitude]);
          }
        } else if (window.destMarker) {
          map.removeLayer(window.destMarker);
          window.destMarker = null;
        }

        if (activePos) {
           if (!map.hasLayer(window.liveDot)) {
              window.liveDot.setLatLng([activePos.latitude, activePos.longitude]).addTo(map);
           } else {
              window.liveDot.setLatLng([activePos.latitude, activePos.longitude]);
           }
        }

        if (!hasInitializedBounds && trailCoords.length > 0) {
           map.fitBounds(window.trailLayer.getBounds(), { padding: [24, 24] });
           hasInitializedBounds = true;
        }
      };
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
  routePolyline = null,
  onRecenter,
  followUser = false,
  isDark = false,
  splitPoints = [],
}: OsmMapViewProps) {
  const webViewRef = useRef<WebView | null>(null);

  // Send update to Leaflet whenever state changes
  useEffect(() => {
    if (webViewRef.current) {
      const script = `
        if (window.updateMap) {
          window.updateMap(
            ${JSON.stringify(coordinates)}, 
            ${JSON.stringify(activeRegion)}, 
            ${JSON.stringify(routePolyline)}, 
            ${JSON.stringify(destination)}
          );
        }
        true;
      `;
      webViewRef.current.injectJavaScript(script);
    }
  }, [coordinates, activeRegion, routePolyline, destination]);

  // Handle followUser explicit recentering
  useEffect(() => {
    if (followUser && activeRegion && webViewRef.current) {
      const script = `
        if (window.recenterMap) {
          window.recenterMap(${activeRegion.latitude}, ${activeRegion.longitude});
        }
        true;
      `;
      webViewRef.current.injectJavaScript(script);
    }
  }, [followUser, activeRegion]);

  // Show/hide recenter button based on followUser
  useEffect(() => {
    if (webViewRef.current) {
      const displayStyle = (followUser || !onRecenter) ? 'none' : 'block';
      const script = `
        var btn = document.getElementById('recenter-btn');
        if (btn) btn.style.display = '${displayStyle}';
        true;
      `;
      webViewRef.current.injectJavaScript(script);
    }
  }, [followUser, onRecenter]);

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        originWhitelist={["*"]}
        source={{ html: buildHtml(routeColor, startColor, endColor, destinationColor, backgroundColor, isDark) }}
        javaScriptEnabled
        domStorageEnabled
        scrollEnabled={true}
        nestedScrollEnabled={true}
        scalesPageToFit={false}
        style={styles.webview}
        onMessage={(event) => {
          try {
            const data = JSON.parse(event.nativeEvent.data);
            if (data.type === "recenter" && onRecenter) {
              onRecenter();
            }
          } catch {}
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  webview: { flex: 1, backgroundColor: "transparent" },
});
