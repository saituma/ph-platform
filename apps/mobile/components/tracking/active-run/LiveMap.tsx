import React, { useRef, useEffect, useMemo } from "react";
import { View } from "react-native";
import type { Region } from "react-native-maps";
import { Ionicons } from "@expo/vector-icons";
import { TrackingMapView } from "../TrackingMapView";
import { MapErrorBoundary } from "../MapErrorBoundary";
import type { TrackingMapLayer, TrackingMapStyle, TrackingMapViewRef } from "../trackingMapLayers";
import { useRunStore } from "@/store/useRunStore";

interface LiveMapProps {
  initialRegion: Region | null;
  isDark: boolean;
  colors: Record<string, string>;
  followUser: boolean;
  routePolyline?: { latitude: number; longitude: number }[] | null;
  onManualMove: () => void;
  mapStyle: TrackingMapStyle;
  onPress?: (coord: { latitude: number; longitude: number }) => void;
  showsPointsOfInterest?: boolean;
}

// Stable inner component — only re-renders when route/coordinates data changes,
// NOT on every GPS coordinate update.
const StableMapLayers = React.memo(function StableMapLayers({
  layers,
  initialRegion,
  isDark,
  mapStyle,
  showsPointsOfInterest,
  onManualMove,
  onPress,
  mapRef,
}: {
  layers: TrackingMapLayer[];
  initialRegion: Region;
  isDark: boolean;
  mapStyle: TrackingMapStyle;
  showsPointsOfInterest: boolean;
  onManualMove: () => void;
  onPress?: (coord: { latitude: number; longitude: number }) => void;
  mapRef: React.RefObject<TrackingMapViewRef | null>;
}) {
  return (
    <TrackingMapView
      ref={mapRef}
      style={{ flex: 1 }}
      initialRegion={initialRegion}
      userInterfaceStyle={isDark ? "dark" : "light"}
      scrollEnabled
      zoomEnabled
      onTouchStart={onManualMove}
      onPress={
        onPress
          ? (e: any) => {
              const c = e?.nativeEvent?.coordinate;
              const lat = c?.latitude;
              const lng = c?.longitude;
              if (typeof lat !== "number" || typeof lng !== "number" || !Number.isFinite(lat) || !Number.isFinite(lng)) {
                return;
              }
              onPress({ latitude: lat, longitude: lng });
            }
          : undefined
      }
      layers={layers}
      mapStyle={mapStyle}
      showsPointsOfInterest={showsPointsOfInterest}
    />
  );
});

export const LiveMap = React.memo(function LiveMap({
  initialRegion,
  isDark,
  colors,
  followUser,
  routePolyline,
  onManualMove,
  mapStyle,
  onPress,
  showsPointsOfInterest = true,
}: LiveMapProps) {
  // Subscribe directly to the store so per-tick GPS updates re-render only LiveMap,
  // not the whole active-run screen.
  const lastCoordinate = useRunStore((s) => s.liveCoordinate);
  const coordinates = useRunStore((s) => s.coordinates);
  const destination = useRunStore((s) => s.destination);

  const mapRef = useRef<TrackingMapViewRef | null>(null);
  const hasAnimatedToFirstFix = useRef(false);
  const lastFollowAtRef = useRef(0);
  const lastFollowCoordRef = useRef<{ latitude: number; longitude: number } | null>(null);

  // Layers only change when route/coordinates data changes — NOT on every GPS tick.
  // The user position is handled by the native showsUserLocation dot on the MapView.
  const layers = useMemo((): TrackingMapLayer[] => {
    const out: TrackingMapLayer[] = [];
    if (routePolyline && routePolyline.length > 1) {
      out.push({
        id: "route-osrm",
        type: "polyline",
        coordinates: routePolyline,
        strokeColor: `${colors.cyan}b3`,
        strokeWidth: 3,
      });
    }
    if (coordinates.length > 1) {
      out.push({
        id: "path",
        type: "polyline",
        coordinates,
        strokeColor: colors.mapRoute,
        strokeWidth: 4,
      });
    }
    if (coordinates.length > 0) {
      out.push({
        id: "start",
        type: "marker",
        coordinate: coordinates[0],
        title: "Start",
        marker: {
          kind: "circle",
          color: colors.lime,
          borderColor: "#fff",
          borderWidth: 2,
          size: 6,
        },
      });
    }
    if (destination?.latitude != null && destination?.longitude != null) {
      out.push({
        id: "destination",
        type: "marker",
        coordinate: {
          latitude: destination.latitude,
          longitude: destination.longitude,
        },
        title: "Destination",
        marker: { kind: "flag", color: colors.coral, size: 26 },
      });
    }
    return out;
  }, [coordinates, destination, routePolyline, colors]);

  // Animate camera to follow user — throttled so it doesn't fight user gestures.
  // Only re-center when ≥2s passed AND user moved ≥12m, OR ≥4s passed regardless.
  // Imperative; no React re-render.
  useEffect(() => {
    if (!followUser || !lastCoordinate) return;
    const now = Date.now();
    const last = lastFollowCoordRef.current;
    let movedMeters = Infinity;
    if (last) {
      const dLat = (lastCoordinate.latitude - last.latitude) * 111000;
      const dLng =
        (lastCoordinate.longitude - last.longitude) *
        111000 *
        Math.cos((lastCoordinate.latitude * Math.PI) / 180);
      movedMeters = Math.sqrt(dLat * dLat + dLng * dLng);
    }
    const elapsed = now - lastFollowAtRef.current;
    const shouldAnimate = (elapsed >= 2000 && movedMeters >= 12) || elapsed >= 4000;
    if (!shouldAnimate) return;

    lastFollowAtRef.current = now;
    lastFollowCoordRef.current = {
      latitude: lastCoordinate.latitude,
      longitude: lastCoordinate.longitude,
    };
    mapRef.current?.animateToRegion(
      {
        latitude: lastCoordinate.latitude,
        longitude: lastCoordinate.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      },
      250,
    );
  }, [lastCoordinate, followUser]);

  useEffect(() => {
    if (!lastCoordinate || !mapRef.current) return;
    if (hasAnimatedToFirstFix.current) return;
    hasAnimatedToFirstFix.current = true;
    mapRef.current.animateToRegion(
      {
        latitude: lastCoordinate.latitude,
        longitude: lastCoordinate.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      },
      600,
    );
  }, [lastCoordinate]);

  // When user re-engages follow (recenter button), reset throttle so the snap is immediate.
  useEffect(() => {
    if (followUser) {
      lastFollowAtRef.current = 0;
      lastFollowCoordRef.current = null;
    }
  }, [followUser]);

  if (!initialRegion) {
    return <View style={{ flex: 1, backgroundColor: colors.surfaceHigh }} />;
  }

  const mapFallback = (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.surfaceHigh,
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <Ionicons name="map-outline" size={40} color={colors.textSecondary} />
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      <MapErrorBoundary fallback={mapFallback}>
        <StableMapLayers
          mapRef={mapRef}
          layers={layers}
          initialRegion={initialRegion}
          isDark={isDark}
          mapStyle={mapStyle}
          showsPointsOfInterest={showsPointsOfInterest}
          onManualMove={onManualMove}
          onPress={onPress}
        />
      </MapErrorBoundary>

      {/* Dim overlay */}
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: colors.bg,
          opacity: isDark ? 0.14 : 0.04,
        }}
      />
    </View>
  );
});
