import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { WebView } from "react-native-webview";
import type { Region } from "react-native-maps";

import type { LatLng, TrackingMapLayer, TrackingMapStyle } from "./trackingMapLayers";
import { regionToLeafletZoom } from "./trackingMapLayers";
import type { TrackingMapViewRef } from "./trackingMapLayers";

const CARTO_LIGHT =
  "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";
const CARTO_DARK =
  "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
/** Esri World Imagery — same source as iOS UrlTile satellite option (no Google key). */
const ESRI_IMAGERY =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";

const LEAFLET_HTML = `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    html, body { margin:0; padding:0; height:100%; }
    #map { height:100%; width:100%; }
    .rn-m div { box-sizing: border-box; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var TILE_LIGHT = ${JSON.stringify(CARTO_LIGHT)};
    var TILE_DARK = ${JSON.stringify(CARTO_DARK)};
    var TILE_SAT = ${JSON.stringify(ESRI_IMAGERY)};
	    var map = L.map('map', { zoomControl: true, attributionControl: true }).setView([20, 0], 2);
	    var layerGroup = L.featureGroup().addTo(map);
	    var base = L.tileLayer(TILE_LIGHT, {
	      subdomains: 'abcd',
	      maxZoom: 19,
	      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
	    }).addTo(map);

    function post(msg) {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify(msg));
      }
    }

    map.on('click', function (e) {
      post({ type: 'press', latitude: e.latlng.lat, longitude: e.latlng.lng });
    });
    map.on('movestart', function () {
      post({ type: 'movestart' });
    });

    function esc(t) {
      return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) {
        return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] || c;
      });
    }

	    window.__setMapStyle = function (mode, dark) {
	      map.removeLayer(base);
	      if (mode === 'satellite') {
	        base = L.tileLayer(TILE_SAT, {
	          maxZoom: 19,
	          attribution: 'Tiles &copy; <a href="https://www.esri.com/">Esri</a> — Source: Esri, Maxar, Earthstar Geographics'
	        }).addTo(map);
	      } else {
	        var u = dark ? TILE_DARK : TILE_LIGHT;
	        base = L.tileLayer(u, {
	          subdomains: 'abcd',
	          maxZoom: 19,
	          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
	        }).addTo(map);
	      }
	    };

    window.__setView = function (lat, lng, zoom) {
      map.setView([lat, lng], zoom, { animate: true, duration: 0.35 });
    };

    window.__redrawLayers = function (layersJson, fitBounds) {
      layerGroup.clearLayers();
      var layers = [];
      try { layers = JSON.parse(layersJson) || []; } catch (e) { layers = []; }
      layers.forEach(function (layer) {
        if (layer.type === 'polyline' && layer.coordinates && layer.coordinates.length > 1) {
          var latlngs = layer.coordinates.map(function (c) {
            return [c.latitude, c.longitude];
          });
          L.polyline(latlngs, {
            color: layer.strokeColor || '#2979FF',
            weight: layer.strokeWidth || 3
          }).addTo(layerGroup);
        } else if (layer.type === 'marker' && layer.coordinate) {
          var lat = layer.coordinate.latitude;
          var lng = layer.coordinate.longitude;
          var m = layer.marker || { kind: 'circle', color: '#2979FF', size: 6 };
          if (m.kind === 'circle') {
            var d = (m.size || 6) * 2;
            var bw = m.borderWidth || 0;
            var bc = m.borderColor || 'transparent';
            var html = '<div style="width:' + d + 'px;height:' + d + 'px;border-radius:50%;background:' + esc(m.color) + ';border:' + bw + 'px solid ' + esc(bc) + '"></div>';
            var icon = L.divIcon({ className: 'rn-m', html: html, iconSize: [d, d], iconAnchor: [d / 2, d / 2] });
            L.marker([lat, lng], { icon: icon, title: layer.title || '' }).addTo(layerGroup);
          } else if (m.kind === 'flag') {
            var fs = m.size || 22;
            var fh = '<div style="font-size:' + fs + 'px;line-height:1">🚩</div>';
            var ficon = L.divIcon({ className: 'rn-m', html: fh, iconSize: [fs, fs], iconAnchor: [fs / 2, fs] });
            L.marker([lat, lng], { icon: ficon, title: layer.title || '' }).addTo(layerGroup);
          } else if (m.kind === 'label') {
            var fz = m.fontSize || 10;
            var lab = '<div style="background:' + esc(m.backgroundColor) + ';border:1px solid ' + esc(m.borderColor) + ';color:' + esc(m.color) + ';border-radius:8px;padding:2px 4px;font-size:' + fz + 'px;font-family:system-ui,sans-serif">' + esc(m.text) + '</div>';
            var lic = L.divIcon({ className: 'rn-m', html: lab, iconSize: [40, 20], iconAnchor: [20, 10] });
            L.marker([lat, lng], { icon: lic }).addTo(layerGroup);
          }
        }
      });
      if (fitBounds && layerGroup.getLayers().length > 0) {
        var b = layerGroup.getBounds();
        if (b.isValid()) {
          map.fitBounds(b, { padding: [20, 20], maxZoom: 16, animate: true });
        }
      }
    };

    post({ type: 'ready' });
  </script>
</body>
</html>`;

export type OsmWebMapViewProps = {
  style?: StyleProp<ViewStyle>;
  initialRegion: Region;
  layers: TrackingMapLayer[];
  isDark: boolean;
  /** Road (Carto) vs Esri satellite tiles. */
  mapStyle?: TrackingMapStyle;
  fitBounds?: boolean;
  onPress?: (c: LatLng) => void;
  onUserPan?: () => void;
};

export const OsmWebMapView = forwardRef<TrackingMapViewRef, OsmWebMapViewProps>(
  function OsmWebMapView(
    {
      style,
      initialRegion,
      layers,
      isDark,
      mapStyle = "road",
      fitBounds = false,
      onPress,
      onUserPan,
    },
    ref,
  ) {
    const webRef = useRef<WebView>(null);
    const readyRef = useRef(false);
    /** First camera placement after WebView ready (live maps: only once; summary: fitBounds-only path skips setView). */
    const needInitialCameraRef = useRef(true);
    /** Last applied road/satellite + light/dark — avoid retiling on every GPS tick (only layers change). */
    const appliedBasemapStampRef = useRef<string | null>(null);
    /** Ignore Leaflet `movestart` briefly after we inject (programmatic redraws must not flip “follow user”). */
    const ignorePanUntilRef = useRef(0);
    const onPressRef = useRef(onPress);
    const onUserPanRef = useRef(onUserPan);
    onPressRef.current = onPress;
    onUserPanRef.current = onUserPan;

    const live = useRef({
      initialRegion,
      layers,
      isDark,
      mapStyle,
      fitBounds,
    });
    live.current = { initialRegion, layers, isDark, mapStyle, fitBounds };

    /** Stable signature for layer JSON — do not tie sync to `initialRegion` (updates every GPS fix on active run). */
    const layersSignature = useMemo(() => JSON.stringify(layers), [layers]);

    const pushAll = useCallback(() => {
      const w = webRef.current;
      if (!w || !readyRef.current) return;
      const p = live.current;
      const z = regionToLeafletZoom(p.initialRegion);
      const layersArg = JSON.stringify(JSON.stringify(p.layers));
      const fit = p.fitBounds ? "true" : "false";
      const dark = p.isDark ? "true" : "false";
      const mode = p.mapStyle === "satellite" ? "'satellite'" : "'road'";
      const basemapStamp = `${p.mapStyle}:${p.isDark ? "dark" : "light"}`;

      const markProgrammaticMapChange = () => {
        ignorePanUntilRef.current = Date.now() + 450;
      };

      if (p.fitBounds) {
        needInitialCameraRef.current = false;
        appliedBasemapStampRef.current = basemapStamp;
        markProgrammaticMapChange();
        w.injectJavaScript(`
          (function(){
            if (window.__setMapStyle) window.__setMapStyle(${mode}, ${dark});
            if (window.__redrawLayers) window.__redrawLayers(${layersArg}, ${fit});
          })();
          true;
        `);
        return;
      }

      if (needInitialCameraRef.current) {
        needInitialCameraRef.current = false;
        appliedBasemapStampRef.current = basemapStamp;
        markProgrammaticMapChange();
        w.injectJavaScript(`
          (function(){
            if (window.__setMapStyle) window.__setMapStyle(${mode}, ${dark});
            if (window.__setView) window.__setView(${p.initialRegion.latitude}, ${p.initialRegion.longitude}, ${z});
            if (window.__redrawLayers) window.__redrawLayers(${layersArg}, false);
          })();
          true;
        `);
        return;
      }

      const needBasemap = appliedBasemapStampRef.current !== basemapStamp;
      if (needBasemap) {
        appliedBasemapStampRef.current = basemapStamp;
      }
      markProgrammaticMapChange();

      const styleBlock = needBasemap
        ? `if (window.__setMapStyle) window.__setMapStyle(${mode}, ${dark});`
        : "";

      w.injectJavaScript(`
        (function(){
          ${styleBlock}
          if (window.__redrawLayers) window.__redrawLayers(${layersArg}, false);
        })();
        true;
      `);
    }, []);

    useEffect(() => {
      if (readyRef.current) pushAll();
    }, [layersSignature, isDark, mapStyle, fitBounds, pushAll]);

    useImperativeHandle(
      ref,
      () => ({
        animateToRegion: (region: Region, duration?: number) => {
          const z = regionToLeafletZoom(region);
          const ms = typeof duration === "number" ? duration : 450;
          ignorePanUntilRef.current = Date.now() + ms + 120;
          webRef.current?.injectJavaScript(
            `window.__setView && window.__setView(${region.latitude}, ${region.longitude}, ${z}); true;`,
          );
        },
      }),
      [],
    );

    const onMessage = useCallback(
      (e: { nativeEvent: { data: string } }) => {
        try {
          const msg = JSON.parse(e.nativeEvent.data) as {
            type: string;
            latitude?: number;
            longitude?: number;
          };
          if (msg.type === "ready") {
            readyRef.current = true;
            pushAll();
            return;
          }
          if (msg.type === "press" && msg.latitude != null && msg.longitude != null) {
            onPressRef.current?.({ latitude: msg.latitude, longitude: msg.longitude });
            return;
          }
          if (msg.type === "movestart") {
            if (Date.now() < ignorePanUntilRef.current) return;
            onUserPanRef.current?.();
            return;
          }
        } catch {
          /* ignore */
        }
      },
      [],
    );

    const html = useMemo(() => LEAFLET_HTML, []);

    return (
      <View style={[styles.fill, style]}>
        <WebView
          ref={webRef}
          source={{ html }}
          style={styles.fill}
          originWhitelist={["*"]}
          javaScriptEnabled
          domStorageEnabled
          onMessage={onMessage}
          mixedContentMode="compatibility"
        />
      </View>
    );
  },
);

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: "#0a0a0b" },
});
