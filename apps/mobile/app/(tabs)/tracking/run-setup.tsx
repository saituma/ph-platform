import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  TextInput,
  View,
} from "react-native";
import type { Region } from "react-native-maps";
import * as Location from "expo-location";
import { Stack, useRouter } from "expo-router";
import { 
  ChevronLeft, 
  Play, 
  MapPin, 
  Target, 
  Bell, 
  BellOff,
  Navigation,
  Map as MapIcon,
  Trash2
} from "lucide-react-native";

import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Text } from "@/components/ScaledText";
import { fonts, radius, spacing } from "@/constants/theme";
import { TrackingMapView } from "@/components/tracking/TrackingMapView";
import { MapStyleSwitcher } from "@/components/tracking/MapStyleSwitcher";
import type { TrackingMapLayer, TrackingMapStyle, TrackingMapViewRef } from "@/components/tracking/trackingMapLayers";
import { haversineDistance } from "@/lib/haversine";
import { requestRunProgressNotificationPermission } from "@/lib/runProgressNotifications";
import { useRunStore } from "../../../store/useRunStore";

type Destination = { latitude: number; longitude: number };

function parseMetersFromInput(raw: string): number | null {
  const s = raw.trim().toLowerCase();
  if (!s) return null;
  const num = Number(s.replace(/[^\d.]/g, ""));
  if (!Number.isFinite(num) || num <= 0) return null;
  if (s.includes("km")) return Math.round(num * 1000);
  return Math.round(num); // meters
}

export default function RunSetupScreen() {
  const router = useRouter();
  const { colors, isDark } = useAppTheme();
  const mapRef = useRef<TrackingMapViewRef | null>(null);

  const [mapStyle, setMapStyle] = useState<TrackingMapStyle>("road");
  const [region, setRegion] = useState<Region>({
    latitude: 0,
    longitude: 0,
    latitudeDelta: 0.06,
    longitudeDelta: 0.06,
  });
  const [current, setCurrent] = useState<{ latitude: number; longitude: number } | null>(null);

  const [destination, setDestination] = useState<Destination | null>(null);
  const [goalText, setGoalText] = useState<string>("");

  const [notifEveryText, setNotifEveryText] = useState<string>("1km");
  const [notifEnabled, setNotifEnabled] = useState<boolean>(false);

  const goalMapLayers = useMemo((): TrackingMapLayer[] => {
    const out: TrackingMapLayer[] = [];
    if (destination) {
      out.push({
        id: "dest",
        type: "marker",
        coordinate: destination,
        title: "Destination",
        marker: {
          kind: "circle",
          color: colors.mapEnd,
          borderColor: "#fff",
          borderWidth: 2,
          size: 7,
        },
      });
    }
    return out;
  }, [colors.mapEnd, destination]);

  const destinationDistanceMeters = useMemo(() => {
    if (!destination || !current) return null;
    return haversineDistance(current.latitude, current.longitude, destination.latitude, destination.longitude);
  }, [current, destination]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (!alive || status !== "granted") return;
        const cur = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (!alive) return;
        const lat = cur?.coords?.latitude;
        const lng = cur?.coords?.longitude;
        if (typeof lat !== "number" || typeof lng !== "number" || !Number.isFinite(lat) || !Number.isFinite(lng)) return;
        setCurrent({ latitude: lat, longitude: lng });
        const next: Region = { latitude: lat, longitude: lng, latitudeDelta: 0.02, longitudeDelta: 0.02 };
        setRegion(next);
        mapRef.current?.animateToRegion(next, 450);
      } catch {
        // ignore
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const selectDestination = useCallback((dest: Destination) => {
    setDestination(dest);
    const next: Region = {
      latitude: dest.latitude,
      longitude: dest.longitude,
      latitudeDelta: 0.04,
      longitudeDelta: 0.04,
    };
    setRegion(next);
    mapRef.current?.animateToRegion(next, 450);
  }, []);

  const onMapPress = useCallback((e: any) => {
    const c = e?.nativeEvent?.coordinate;
    const lat = c?.latitude;
    const lng = c?.longitude;
    if (typeof lat !== "number" || typeof lng !== "number" || !Number.isFinite(lat) || !Number.isFinite(lng)) return;
    selectDestination({ latitude: lat, longitude: lng });
  }, [selectDestination]);

  const notifEveryMeters = useMemo(() => (notifEnabled ? parseMetersFromInput(notifEveryText) : null), [notifEnabled, notifEveryText]);

  const startRun = useCallback(async () => {
    const goalKm =
      destination
        ? null
        : (() => {
            const v = Number(goalText.trim());
            return Number.isFinite(v) && v > 0 ? Math.min(200, v) : null;
          })();

    let every = notifEveryMeters;
    if (every != null) {
      const ok = await requestRunProgressNotificationPermission();
      if (!ok) {
        const proceed = await new Promise<boolean>((resolve) => {
          Alert.alert(
            "Enable notifications?",
            "To get distance alerts, allow notifications.",
            [
              { text: "Run without", style: "cancel", onPress: () => resolve(false) },
              { text: "Try again", onPress: () => resolve(true) },
            ],
          );
        });
        if (!proceed) {
          every = null;
        } else {
          const ok2 = await requestRunProgressNotificationPermission();
          if (!ok2) every = null;
        }
      }
    }

    useRunStore.getState().setDestination(destination);
    useRunStore.getState().setGoalKm(goalKm);
    useRunStore.getState().setProgressNotifyEveryMeters(every);

    router.replace("/(tabs)/tracking/active-run" as any);
  }, [destination, goalText, notifEveryMeters, router]);

  // Design Tokens
  const glassBg = isDark ? "rgba(10,10,10,0.72)" : "rgba(255,255,255,0.85)";
  const glassBorder = isDark ? "rgba(255,255,255,0.12)" : "rgba(15,23,42,0.10)";
  const cardBg = isDark ? colors.cardElevated : colors.background;
  const accentMuted = `${colors.accent}15`;

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
          presentation: "fullScreenModal",
        }}
      />
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <TrackingMapView
          ref={mapRef}
          style={{ flex: 1 }}
          initialRegion={region.latitude !== 0 ? region : undefined}
          layers={goalMapLayers}
          mapStyle={mapStyle}
          onPress={onMapPress}
        />

        <MapStyleSwitcher value={mapStyle} onChange={setMapStyle} colors={colors} left={14} anchorBottom={20} />

        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            paddingTop: Platform.OS === "ios" ? 10 : 30,
            paddingHorizontal: spacing.xl,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Pressable
              onPress={() => router.back()}
              style={({ pressed }) => ({
                width: 44,
                height: 44,
                borderRadius: radius.pill,
                backgroundColor: glassBg,
                borderWidth: 1,
                borderColor: glassBorder,
                alignItems: "center",
                justifyContent: "center",
                opacity: pressed ? 0.85 : 1,
              })}
            >
              <ChevronLeft size={24} color={colors.textPrimary} strokeWidth={2.5} />
            </Pressable>

            <View style={{ 
              backgroundColor: glassBg, 
              paddingHorizontal: 20, 
              paddingVertical: 8, 
              borderRadius: radius.pill, 
              borderWidth: 1, 
              borderColor: glassBorder,
              alignItems: "center" 
            }}>
              <Text style={{ fontFamily: fonts.accentBold, fontSize: 15, color: colors.textPrimary }}>RUN SETUP</Text>
            </View>

            <Pressable
              onPress={() => void startRun()}
              style={({ pressed }) => ({
                height: 44,
                paddingHorizontal: 20,
                borderRadius: radius.pill,
                backgroundColor: colors.accent,
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                opacity: pressed ? 0.9 : 1,
                ...(isDark ? {} : {
                  shadowColor: colors.accent,
                  shadowOpacity: 0.3,
                  shadowRadius: 10,
                  shadowOffset: { width: 0, height: 4 },
                  elevation: 4
                })
              })}
            >
              <Play size={18} color="#FFF" fill="#FFF" />
              <Text style={{ fontFamily: fonts.accentBold, fontSize: 14, color: "#FFF" }}>START</Text>
            </Pressable>
          </View>
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ position: "absolute", left: 0, right: 0, bottom: 0 }}
        >
          <View
            style={{
              paddingHorizontal: spacing.xl,
              paddingTop: 20,
              paddingBottom: Platform.OS === "ios" ? 34 : 24,
              backgroundColor: glassBg,
              borderTopWidth: 1,
              borderTopColor: glassBorder,
              borderTopLeftRadius: radius.xxl,
              borderTopRightRadius: radius.xxl,
            }}
          >
            {/* Configuration Panels */}
            <View style={{ gap: 16 }}>
              {/* Destination Section */}
              <View style={{ backgroundColor: cardBg, borderRadius: radius.xl, padding: 16, borderWidth: 1, borderColor: colors.border }}>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <MapPin size={16} color={colors.accent} strokeWidth={2.5} />
                    <Text style={{ fontFamily: fonts.labelCaps, fontSize: 10, color: colors.textSecondary, letterSpacing: 1.5 }}>DESTINATION</Text>
                  </View>
                  {destination && (
                    <Pressable onPress={() => setDestination(null)} style={{ padding: 4 }}>
                      <Trash2 size={16} color={colors.danger} />
                    </Pressable>
                  )}
                </View>

                {destination ? (
                  <View>
                    <Text style={{ fontFamily: fonts.bodyBold, fontSize: 15, color: colors.textPrimary }}>Target Location Set</Text>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 }}>
                      <Navigation size={12} color={colors.textSecondary} />
                      <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.textSecondary }}>
                        {destinationDistanceMeters != null
                          ? `${(destinationDistanceMeters / 1000).toFixed(2)} km away`
                          : "Distance calculating..."}
                      </Text>
                    </View>
                  </View>
                ) : (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <MapIcon size={14} color={colors.textDim} />
                    <Text style={{ fontFamily: fonts.bodyRegular, fontSize: 13, color: colors.textDim }}>
                      Optional. Tap map to set a finish line.
                    </Text>
                  </View>
                )}
              </View>

              {/* Goal & Notifications Row */}
              <View style={{ flexDirection: "row", gap: 12 }}>
                {/* Goal Input */}
                {!destination && (
                  <View style={{ flex: 1.2, backgroundColor: cardBg, borderRadius: radius.xl, padding: 16, borderWidth: 1, borderColor: colors.border }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 }}>
                      <Target size={16} color={colors.purple} strokeWidth={2.5} />
                      <Text style={{ fontFamily: fonts.labelCaps, fontSize: 10, color: colors.textSecondary, letterSpacing: 1.5 }}>GOAL</Text>
                    </View>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <TextInput
                        keyboardType="decimal-pad"
                        value={goalText}
                        onChangeText={setGoalText}
                        placeholder="0.0"
                        placeholderTextColor={colors.placeholder}
                        style={{
                          flex: 1,
                          height: 32,
                          color: colors.text,
                          fontFamily: fonts.heroDisplay,
                          fontSize: 20,
                          padding: 0,
                        }}
                      />
                      <Text style={{ fontFamily: fonts.labelMedium, color: colors.textDim }}>km</Text>
                    </View>
                  </View>
                )}

                {/* Notification Toggle */}
                <Pressable 
                  onPress={() => setNotifEnabled((v) => !v)}
                  style={({ pressed }) => ({ 
                    flex: 1, 
                    backgroundColor: notifEnabled ? accentMuted : cardBg, 
                    borderRadius: radius.xl, 
                    padding: 16, 
                    borderWidth: 1, 
                    borderColor: notifEnabled ? colors.accent : colors.border,
                    opacity: pressed ? 0.9 : 1
                  })}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 }}>
                    {notifEnabled ? <Bell size={16} color={colors.accent} strokeWidth={2.5} /> : <BellOff size={16} color={colors.textDim} strokeWidth={2} />}
                    <Text style={{ fontFamily: fonts.labelCaps, fontSize: 10, color: notifEnabled ? colors.accent : colors.textSecondary, letterSpacing: 1.5 }}>ALERTS</Text>
                  </View>
                  <Text style={{ fontFamily: fonts.accentBold, fontSize: 16, color: notifEnabled ? colors.accent : colors.textDim }}>
                    {notifEnabled ? notifEveryText : "OFF"}
                  </Text>
                </Pressable>
              </View>

              {/* Notification Quick Pickers (only if enabled) */}
              {notifEnabled && (
                <View style={{ flexDirection: "row", gap: 8 }}>
                  {["500m", "1km", "2km", "5km"].map((val) => (
                    <Pressable
                      key={val}
                      onPress={() => setNotifEveryText(val.replace("m", ""))}
                      style={({ pressed }) => ({
                        flex: 1,
                        height: 36,
                        borderRadius: radius.lg,
                        backgroundColor: notifEveryText === val.replace("m", "") || (val === "1km" && notifEveryText === "1000") ? colors.accent : cardBg,
                        borderWidth: 1,
                        borderColor: notifEveryText === val.replace("m", "") ? colors.accent : colors.border,
                        alignItems: "center",
                        justifyContent: "center",
                        opacity: pressed ? 0.8 : 1,
                      })}
                    >
                      <Text style={{ 
                        fontFamily: fonts.bodyBold, 
                        fontSize: 12, 
                        color: notifEveryText === val.replace("m", "") ? "#FFF" : colors.textSecondary 
                      }}>
                        {val}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </>
  );
}
