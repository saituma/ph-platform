import React from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import MapView, {
  MAP_TYPES,
  Marker,
  Polyline,
  type MapViewProps,
} from "react-native-maps";
import { Ionicons } from "@expo/vector-icons";

import { OsmWebMapView } from "./OsmWebMapView";
import type {
  TrackingMapLayer,
  TrackingMapStyle,
  TrackingMapViewRef,
} from "./trackingMapLayers";

type MapViewRef = React.ElementRef<typeof MapView>;

type Props = Omit<MapViewProps, "children"> & {
  mapType?: MapViewProps["mapType"] | "none";
  /**
   * Polylines + markers. On **Android**, maps render via Leaflet + OpenStreetMap tiles in a WebView
   * (no Google Maps API key). On **iOS**, Apple Maps (`standard` / `satellite`).
   */
  layers: TrackingMapLayer[];
  /** Android OSM: zoom to show all layers after updates (e.g. run summary). */
  fitBounds?: boolean;
  /** Street map vs satellite imagery (native on iOS; Carto + Esri on Android WebView). */
  mapStyle?: TrackingMapStyle;
};

function IosMarkerLayer({ layer }: { layer: Extract<TrackingMapLayer, { type: "marker" }> }) {
  const { coordinate, title, marker } = layer;
  if (marker.kind === "circle") {
    const d = marker.size * 2;
    return (
      <Marker
        coordinate={coordinate}
        title={title}
        anchor={{ x: 0.5, y: 0.5 }}
        tracksViewChanges={false}
      >
        <View
          style={{
            width: d,
            height: d,
            borderRadius: marker.size,
            backgroundColor: marker.color,
            borderWidth: marker.borderWidth ?? 0,
            borderColor: marker.borderColor ?? "transparent",
          }}
        />
      </Marker>
    );
  }
  if (marker.kind === "flag") {
    return (
      <Marker
        coordinate={coordinate}
        title={title}
        anchor={{ x: 0.5, y: 1 }}
        tracksViewChanges={false}
      >
        <Ionicons name="flag" size={marker.size} color={marker.color} />
      </Marker>
    );
  }
  const m = marker;
  return (
    <Marker coordinate={coordinate} title={title} tracksViewChanges={false}>
      <View
        style={{
          backgroundColor: m.backgroundColor,
          borderColor: m.borderColor,
          borderWidth: 1,
          borderRadius: 8,
          paddingHorizontal: 4,
          paddingVertical: 2,
        }}
      >
        <Text
          style={{
            fontSize: m.fontSize ?? 10,
            fontWeight: "600",
            color: m.color,
          }}
        >
          {m.text}
        </Text>
      </View>
    </Marker>
  );
}

export const TrackingMapView = React.forwardRef<TrackingMapViewRef, Props>(
  function TrackingMapView(
    {
      style,
      layers,
      fitBounds = false,
      mapStyle = "road",
      ...mapProps
    },
    ref,
  ) {
    const isDark = mapProps.userInterfaceStyle === "dark";
    const effectiveMapType =
      mapStyle === "satellite" ? MAP_TYPES.SATELLITE : MAP_TYPES.STANDARD;

    const onPressWrapped = mapProps.onPress
      ? (c: { latitude: number; longitude: number }) => {
          mapProps.onPress?.({
            nativeEvent: {
              coordinate: c,
              position: { x: 0, y: 0 },
            },
          } as Parameters<NonNullable<MapViewProps["onPress"]>>[0]);
        }
      : undefined;

    if (Platform.OS === "android") {
      const initialRegion = mapProps.initialRegion;
      if (!initialRegion) {
        return <View style={[styles.fill, style]} />;
      }
      return (
        <OsmWebMapView
          ref={ref}
          style={style}
          initialRegion={initialRegion}
          layers={layers}
          isDark={isDark}
          mapStyle={mapStyle}
          fitBounds={fitBounds}
          onPress={onPressWrapped}
          onUserPan={
            mapProps.onTouchStart
              ? () => {
                  mapProps.onTouchStart?.({} as Parameters<NonNullable<MapViewProps["onTouchStart"]>>[0]);
                }
              : undefined
          }
        />
      );
    }

    return (
      <MapView
        ref={ref as React.Ref<MapViewRef>}
        style={[styles.fill, style]}
        {...mapProps}
        mapType={effectiveMapType}
        rotateEnabled={mapProps.rotateEnabled ?? false}
        pitchEnabled={mapProps.pitchEnabled ?? false}
        showsBuildings={false}
        showsTraffic={false}
        showsIndoors={false}
      >
        {layers.map((layer) => {
          if (layer.type === "polyline") {
            return (
              <Polyline
                key={layer.id}
                coordinates={layer.coordinates}
                strokeColor={layer.strokeColor}
                strokeWidth={layer.strokeWidth}
                geodesic
              />
            );
          }
          return <IosMarkerLayer key={layer.id} layer={layer} />;
        })}
      </MapView>
    );
  },
);

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
