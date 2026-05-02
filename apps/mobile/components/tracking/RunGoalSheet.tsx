import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import type { Region } from "react-native-maps";
import * as Location from "expo-location";
import Constants from "expo-constants";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Text } from "@/components/ScaledText";
import { fonts, radius, spacing, icons } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { TrackingMapView } from "./TrackingMapView";
import { MapStyleSwitcher } from "./MapStyleSwitcher";
import type {
  TrackingMapLayer,
  TrackingMapStyle,
  TrackingMapViewRef,
} from "./trackingMapLayers";

type Destination = { latitude: number; longitude: number };

type RunGoalSheetProps = {
  visible: boolean;
  onClose: () => void;
  onConfirm: (goalKm: number | null, destination: Destination | null) => void;
};

export function RunGoalSheet({
  visible,
  onClose,
  onConfirm,
}: RunGoalSheetProps) {
  const { colors, isDark } = useAppTheme();
  const insets = useAppSafeAreaInsets();
  const mapRef = useRef<TrackingMapViewRef | null>(null);

  const [step, setStep] = useState<"destination" | "distance">("destination");
  const [mapStyle, setMapStyle] = useState<TrackingMapStyle>("road");
  const [showPicker, setShowPicker] = useState(false);
  const [destination, setDestination] = useState<Destination | null>(null);
  const [goalText, setGoalText] = useState("");
  const [region, setRegion] = useState<Region>({
    latitude: 0,
    longitude: 0,
    latitudeDelta: 0.08,
    longitudeDelta: 0.08,
  });

  const [routePreview, setRoutePreview] = useState<{ latitude: number; longitude: number }[] | null>(null);
  const [routeMeta, setRouteMeta] = useState<{ durationSec: number; distanceM: number } | null>(null);

  const goalMapLayers = useMemo((): TrackingMapLayer[] => {
    const out: TrackingMapLayer[] = [];
    if (routePreview && routePreview.length > 1) {
      out.push({
        id: "route-preview",
        type: "polyline",
        coordinates: routePreview,
        strokeColor: "#2979FF",
        strokeWidth: 4,
      });
    }
    if (destination?.latitude != null && destination?.longitude != null) {
      out.push({
        id: "dest",
        type: "marker",
        coordinate: destination,
        title: "Destination",
        marker: {
          kind: "circle",
          color: colors.coral,
          borderColor: "#fff",
          borderWidth: 2,
          size: 7,
        },
      });
    }
    return out;
  }, [routePreview, destination, colors.coral]);

  const isExpoGoAndroid =
    Constants.appOwnership === "expo" && Platform.OS === "android";

  useEffect(() => {
    if (!visible) return;
    setStep("destination");
    setShowPicker(false);
    setDestination(null);
    setGoalText("");
    setRoutePreview(null);
    setRouteMeta(null);
  }, [visible]);

  useEffect(() => {
    if (!showPicker) return;
    let isMounted = true;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") return;
        const current = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (!isMounted) return;
        const lat = current?.coords?.latitude;
        const lng = current?.coords?.longitude;
        if (typeof lat !== "number" || typeof lng !== "number" || !isFinite(lat) || !isFinite(lng)) {
          return;
        }
        const nextRegion: Region = {
          latitude: lat,
          longitude: lng,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        };
        setRegion(nextRegion);
        mapRef.current?.animateToRegion(nextRegion, 450);
      } catch {
        // ignore and use default region
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [showPicker]);

  const fetchDrivingRoute = useCallback(async (dest: Destination) => {
		    setRoutePreview(null);
		    setRouteMeta(null);
		    try {
	      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;
      const cur = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const fromLat = cur?.coords?.latitude;
      const fromLng = cur?.coords?.longitude;
      if (typeof fromLat !== "number" || typeof fromLng !== "number") return;

      const url = `https://router.project-osrm.org/route/v1/driving/${fromLng},${fromLat};${dest.longitude},${dest.latitude}?overview=full&geometries=geojson`;
	      const res = await fetch(url, { headers: { Accept: "application/json" } });
	      if (!res.ok) throw new Error(`OSRM HTTP ${res.status}`);
	      const data = await res.json();
	      if (data.routes?.[0]?.geometry?.coordinates) {
	        const coords = data.routes[0].geometry.coordinates as [number, number][];
	        setRoutePreview(coords.map(([lng, lat]) => ({ latitude: lat, longitude: lng })));
	        setRouteMeta({
          durationSec: data.routes[0].duration ?? 0,
          distanceM: data.routes[0].distance ?? 0,
        });
      }
    } catch (e) {
      console.warn("OSRM route preview failed", e);
	    }
	  }, []);

  const onMapPick = async (coord: Destination) => {
    setDestination(coord);
    await fetchDrivingRoute(coord);
  };

  const parsedGoalKm = useMemo(() => {
    const value = Number(goalText);
    if (!Number.isFinite(value) || value <= 0) return null;
    return value;
  }, [goalText]);

  const closeAndConfirm = (goalKm: number | null, dest: Destination | null) => {
    onConfirm(goalKm, dest);
    onClose();
  };

  const routeSummary =
    routeMeta != null
      ? `${Math.max(1, Math.round(routeMeta.durationSec / 60))} min · ${(routeMeta.distanceM / 1000).toFixed(2)} km`
      : null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.5)",
          justifyContent: "flex-end",
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View
            style={{
              backgroundColor: colors.surface,
              borderTopLeftRadius: radius.xxl,
              borderTopRightRadius: radius.xxl,
              borderColor: colors.borderSubtle,
              borderWidth: 1,
              maxHeight: "85%",
              paddingTop: spacing.xl,
              paddingHorizontal: spacing.xl,
              paddingBottom: spacing.xl + insets.bottom,
            }}
          >
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: spacing.lg }}
              keyboardShouldPersistTaps="handled"
            >
              {!showPicker && step === "destination" ? (
                <>
                  <Text
                    style={{
                      fontFamily: fonts.heading1,
                      fontSize: 22,
                      color: colors.text,
                    }}
                  >
                    Do you have a destination?
                  </Text>
                  <Text
                    style={{
                      fontFamily: fonts.bodyMedium,
                      fontSize: 14,
                      color: colors.textSecondary,
                      marginTop: 6,
                    }}
                  >
                    Optional — you can skip this.
                  </Text>

                  <View style={{ marginTop: spacing.lg, gap: 12 }}>
                    <Pressable
                      onPress={() => setShowPicker(true)}
                      style={{
                        height: 54,
                        borderRadius: radius.xl,
                        backgroundColor: colors.surfaceHigh,
                        borderColor: colors.borderMid,
                        borderWidth: 1,
                        alignItems: "center",
                        justifyContent: "center",
                        flexDirection: "row",
                        gap: 8,
                      }}
                    >
                      <Ionicons
                        name={icons.route.name as any}
                        size={18}
                        color={colors.textPrimary}
                      />
                      <Text
                        style={{
                          fontFamily: fonts.heading3,
                          fontSize: 16,
                          color: colors.textPrimary,
                        }}
                      >
                        Pick on map
                      </Text>
                    </Pressable>

                    <Pressable
                      onPress={() => setStep("distance")}
                      style={{
                        height: 54,
                        borderRadius: radius.xl,
                        backgroundColor: "transparent",
                        borderColor: colors.borderSubtle,
                        borderWidth: 1,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: fonts.heading3,
                          fontSize: 16,
                          color: colors.textSecondary,
                        }}
                      >
                        Skip
                      </Text>
                    </Pressable>
                  </View>
                </>
              ) : null}

              {showPicker ? (
                <>
                  <Text
                    style={{
                      fontFamily: fonts.heading1,
                      fontSize: 20,
                      color: colors.text,
                    }}
                  >
                    Tap the map
                  </Text>
                  {isExpoGoAndroid ? (
                    <Text
                      style={{
                        fontFamily: fonts.bodyMedium,
                        fontSize: 12,
                        color: colors.textSecondary,
                        marginTop: 4,
                      }}
                    >
                      Expo Go on Android may not render the map. You can still
                      skip.
                    </Text>
                  ) : null}

                  <View
                    style={{
                      height: 240,
                      borderRadius: radius.xl,
                      overflow: "hidden",
                      marginTop: spacing.md,
                      position: "relative",
                    }}
                  >
                    <TrackingMapView
                      ref={mapRef}
                      style={{ flex: 1 }}
                      initialRegion={region}
                      userInterfaceStyle={isDark ? "dark" : "light"}
                      onPress={(e) => {
                        void onMapPick(e.nativeEvent.coordinate);
                      }}
                      layers={goalMapLayers}
                      mapStyle={mapStyle}
                    />
                    <MapStyleSwitcher
                      value={mapStyle}
                      onChange={setMapStyle}
                      colors={colors}
                      bottomOffset={8}
                      left={10}
                    />
                  </View>

                  {routeSummary ? (
                    <Text
                      style={{
                        fontFamily: fonts.bodyMedium,
                        fontSize: 13,
                        color: colors.textSecondary,
                        marginTop: spacing.sm,
                      }}
                    >
                      Driving route: {routeSummary}
                    </Text>
                  ) : null}

                  <View style={{ marginTop: spacing.lg, gap: 10 }}>
                    <Pressable
                      onPress={() => {
                        setShowPicker(false);
                        setStep("distance");
                      }}
                      style={{
                        height: 54,
                        borderRadius: radius.xl,
                        backgroundColor: colors.accent,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: fonts.heading3,
                          fontSize: 16,
                          color: colors.textInverse,
                        }}
                      >
                        Use this destination
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => {
                        setDestination(null);
                        setRoutePreview(null);
                        setRouteMeta(null);
                        setShowPicker(false);
                        setStep("distance");
                      }}
                      style={{
                        height: 54,
                        borderRadius: radius.xl,
                        backgroundColor: "transparent",
                        borderColor: colors.borderSubtle,
                        borderWidth: 1,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: fonts.heading3,
                          fontSize: 16,
                          color: colors.textSecondary,
                        }}
                      >
                        Skip
                      </Text>
                    </Pressable>
                  </View>
                </>
              ) : null}

              {!showPicker && step === "distance" ? (
                <>
                  <Text
                    style={{
                      fontFamily: fonts.heading1,
                      fontSize: 22,
                      color: colors.text,
                    }}
                  >
                    Any distance goal?
                  </Text>
                  <Text
                    style={{
                      fontFamily: fonts.bodyMedium,
                      fontSize: 14,
                      color: colors.textSecondary,
                      marginTop: 6,
                    }}
                  >
                    Optional — enter a number in km.
                  </Text>

                  <View style={{ marginTop: spacing.lg }}>
                    <TextInput
                      keyboardType="decimal-pad"
                      placeholder="e.g., 5.0"
                      placeholderTextColor={colors.textDim}
                      value={goalText}
                      onChangeText={setGoalText}
                      style={{
                        height: 52,
                        borderRadius: radius.lg,
                        borderColor: colors.borderMid,
                        borderWidth: 1,
                        paddingHorizontal: 14,
                        fontFamily: fonts.bodyMedium,
                        color: colors.text,
                        backgroundColor: colors.surfaceHigh,
                      }}
                    />
                  </View>

                  <View style={{ marginTop: spacing.lg, gap: 10 }}>
                    <Pressable
                      onPress={() => closeAndConfirm(parsedGoalKm, destination)}
                      style={{
                        height: 56,
                        borderRadius: radius.xl,
                        backgroundColor: colors.accent,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: fonts.heading3,
                          fontSize: 16,
                          color: colors.textInverse,
                        }}
                      >
                        Start Run
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => closeAndConfirm(null, destination)}
                      style={{
                        height: 56,
                        borderRadius: radius.xl,
                        backgroundColor: "transparent",
                        borderColor: colors.borderSubtle,
                        borderWidth: 1,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: fonts.heading3,
                          fontSize: 16,
                          color: colors.textSecondary,
                        }}
                      >
                        Skip
                      </Text>
                    </Pressable>
                  </View>
                </>
              ) : null}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
