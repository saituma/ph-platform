import React, { useRef, useEffect, useState } from "react";
import { View, Pressable } from "react-native";
import MapView, { Marker, Polyline, Region } from "react-native-maps";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";
import { PulsingDot } from "../PulsingDot";
import { OsmMapView } from "../OsmMapView";
import { radius } from "@/constants/theme";

interface LiveMapProps {
  useOsmMap: boolean;
  activeRegion: Region | null;
  coordinates: any[];
  lastCoordinate: any;
  destination: any;
  isDark: boolean;
  colors: any;
  followUser: boolean;
  routePolyline?: {latitude: number; longitude: number}[] | null;
  isWarmedUp?: boolean;
  onManualMove: () => void;
  onRecenter: () => void;
}

export function LiveMap({
  useOsmMap,
  activeRegion,
  coordinates,
  lastCoordinate,
  destination,
  isDark,
  colors,
  followUser,
  routePolyline,
  isWarmedUp,
  onManualMove,
  onRecenter,
}: LiveMapProps) {
  const mapRef = useRef<MapView | null>(null);
  const [locationPermissionGranted, setLocationPermissionGranted] =
    useState(false);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationPermissionGranted(status === "granted");
    })();
  }, []);

  useEffect(() => {
    if (followUser && activeRegion && !useOsmMap) {
      mapRef.current?.animateToRegion(activeRegion, 450);
    }
  }, [activeRegion, followUser, useOsmMap]);

  if (!activeRegion) {
    return <View style={{ flex: 1, backgroundColor: colors.surfaceHigh }} />;
  }

  return (
    <View style={{ flex: 1 }}>
      {useOsmMap ? (
        <OsmMapView
          coordinates={coordinates}
          routeColor={colors.mapRoute}
          startColor={colors.lime}
          endColor={colors.cyan}
          destinationColor={colors.coral}
          backgroundColor={colors.surfaceHigh}
          destination={destination}
          activeRegion={activeRegion}
          routePolyline={routePolyline}
          followUser={followUser}
          isDark={isDark}
          onRecenter={onRecenter}
        />
      ) : (
        <MapView
          ref={mapRef}
          style={{ flex: 1 }}
          initialRegion={activeRegion}
          customMapStyle={[]}
          mapType="satellite"
          showsBuildings={false}
          userInterfaceStyle={isDark ? "dark" : "light"}
          showsUserLocation={locationPermissionGranted}
          showsMyLocationButton={false}
          followsUserLocation={followUser}
          pitchEnabled={false}
          rotateEnabled={false}
          scrollEnabled={true}
          zoomEnabled={true}
          onTouchStart={onManualMove}
        >
          {routePolyline && routePolyline.length > 1 && (
            <Polyline
              coordinates={routePolyline}
              strokeColor={`${colors.cyan}b3`}
              strokeWidth={3}
              geodesic={true}
            />
          )}

          {coordinates.length > 1 && (
            <Polyline
              coordinates={coordinates}
              strokeColor={colors.mapRoute}
              strokeWidth={4}
              geodesic={true}
            />
          )}

          {coordinates.length > 0 && (
            <Marker coordinate={coordinates[0]} anchor={{ x: 0.5, y: 0.5 }} tracksViewChanges={false}>
              <View
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: radius.pill,
                  backgroundColor: colors.lime,
                  borderWidth: 2,
                  borderColor: colors.bg,
                }}
              />
            </Marker>
          )}

          {destination && (
            <Marker coordinate={destination} anchor={{ x: 0.5, y: 1 }} tracksViewChanges={false}>
              <Ionicons name="flag" size={24} color={colors.coral} />
            </Marker>
          )}

          {lastCoordinate && (
            <Marker coordinate={lastCoordinate} anchor={{ x: 0.5, y: 0.5 }} tracksViewChanges={false}>
              <PulsingDot size={8} color={colors.cyan} />
            </Marker>
          )}
        </MapView>
      )}

      {/* Tone map */}
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

      {/* Recenter control */}
      {!followUser && (
        <View style={{ position: "absolute", top: 12, right: 12 }}>
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
