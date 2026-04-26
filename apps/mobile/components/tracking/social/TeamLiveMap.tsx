import React, { useMemo } from "react";
import { View, StyleSheet } from "react-native";
import { TrackingMapView } from "../TrackingMapView";
import { type UserLocation } from "@/services/tracking/locationService";
import { type TrackingMapLayer } from "../trackingMapLayers";
import { radius } from "@/constants/theme";

export function TeamLiveMap({
  locations,
  colors,
  isDark,
}: {
  locations: UserLocation[];
  colors: any;
  isDark: boolean;
}) {
  const layers = useMemo<TrackingMapLayer[]>(() => {
    const result: TrackingMapLayer[] = [];
    for (const loc of locations) {
      if (loc.routePoints && loc.routePoints.length >= 2) {
        result.push({
          id: `route-${loc.userId}`,
          type: "polyline",
          coordinates: loc.routePoints.map((p) => ({
            latitude: p.lat,
            longitude: p.lng,
          })),
          strokeColor: colors.accent,
          strokeWidth: 3,
        });
      }
      result.push({
        id: `user-${loc.userId}`,
        type: "marker",
        coordinate: {
          latitude: loc.latitude,
          longitude: loc.longitude,
        },
        title: loc.name,
        marker: {
          kind: "circle",
          size: 10,
          color: colors.accent,
          borderColor: "#fff",
          borderWidth: 2,
        },
      });
    }
    return result;
  }, [locations, colors.accent]);

  const initialRegion = useMemo(() => {
    if (locations.length === 0) return undefined;
    // Simple average for initial view
    const lat = locations.reduce((acc, l) => acc + l.latitude, 0) / locations.length;
    const lng = locations.reduce((acc, l) => acc + l.longitude, 0) / locations.length;
    return {
      latitude: lat,
      longitude: lng,
      latitudeDelta: 0.05,
      longitudeDelta: 0.05,
    };
  }, [locations]);

  return (
    <View style={styles.container}>
      <TrackingMapView
        layers={layers}
        initialRegion={initialRegion}
        userInterfaceStyle={isDark ? "dark" : "light"}
        style={styles.map}
        mapStyle="road"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 400,
    borderRadius: radius.xxl,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  map: {
    flex: 1,
  },
});
