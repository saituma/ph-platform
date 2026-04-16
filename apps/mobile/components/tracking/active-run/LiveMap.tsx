import React, { useRef, useEffect, useMemo, useState } from "react";
import { View, Pressable } from "react-native";
import type { Region } from "react-native-maps";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { TrackingMapView } from "../TrackingMapView";
import { MapErrorBoundary } from "../MapErrorBoundary";
import { MapStyleSwitcher } from "../MapStyleSwitcher";
import type { TrackingMapLayer, TrackingMapStyle, TrackingMapViewRef } from "../trackingMapLayers";
import { mainTabBarTotalHeight } from "../../../lib/tracking/mainTabBarInset";

interface LiveMapProps {
  activeRegion: Region | null;
  coordinates: { latitude: number; longitude: number }[];
  lastCoordinate: { latitude: number; longitude: number } | null;
  destination: { latitude: number; longitude: number } | null;
  isDark: boolean;
  colors: Record<string, string>;
  followUser: boolean;
  routePolyline?: { latitude: number; longitude: number }[] | null;
  onManualMove: () => void;
  onRecenter: () => void;
  /** When set, map style control sits this many px from the bottom (e.g. above pause/stop). */
  mapStyleAnchorBottom?: number;
}

export function LiveMap({
  activeRegion,
  coordinates,
  lastCoordinate,
  destination,
  isDark,
  colors,
  followUser,
  routePolyline,
  onManualMove,
  onRecenter,
  mapStyleAnchorBottom,
}: LiveMapProps) {
  const insets = useSafeAreaInsets();
  const [mapStyle, setMapStyle] = useState<TrackingMapStyle>("road");
  const mapRef = useRef<TrackingMapViewRef | null>(null);
  const hasAnimatedToFirstFix = useRef(false);

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
    if (lastCoordinate?.latitude != null && lastCoordinate?.longitude != null) {
      out.push({
        id: "user",
        type: "marker",
        coordinate: {
          latitude: lastCoordinate.latitude,
          longitude: lastCoordinate.longitude,
        },
        title: "You",
        marker: {
          kind: "circle",
          color: "#2979FF",
          borderColor: "#ffffff",
          borderWidth: 3,
          size: 8,
        },
      });
    }
    return out;
  }, [coordinates, lastCoordinate, destination, routePolyline, colors]);

  useEffect(() => {
    if (followUser && activeRegion) {
      mapRef.current?.animateToRegion(activeRegion, 450);
    }
  }, [activeRegion, followUser]);

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

  if (!activeRegion) {
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
        <TrackingMapView
          ref={mapRef}
          style={{ flex: 1 }}
          initialRegion={activeRegion}
          userInterfaceStyle={isDark ? "dark" : "light"}
          scrollEnabled
          zoomEnabled
          onTouchStart={onManualMove}
          layers={layers}
          mapStyle={mapStyle}
        />
      </MapErrorBoundary>

      {/* Dim sits under controls so Map / Satellite stays visible (see MapStyleSwitcher). */}
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

      <MapStyleSwitcher
        value={mapStyle}
        onChange={setMapStyle}
        colors={colors}
        left={16}
        anchorBottom={
          mapStyleAnchorBottom ??
          12 + mainTabBarTotalHeight(insets.bottom)
        }
      />

      {!followUser && (
        <View style={{ position: "absolute", top: 12, right: 12, zIndex: 6 }}>
          <Pressable
            onPress={onRecenter}
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: colors.surfaceHigh,
              borderWidth: 1,
              borderColor: colors.borderSubtle,
              alignItems: "center",
              justifyContent: "center",
              opacity: 0.92,
            }}
          >
            <Ionicons name="locate" size={18} color={colors.textPrimary} />
          </Pressable>
        </View>
      )}
    </View>
  );
}
