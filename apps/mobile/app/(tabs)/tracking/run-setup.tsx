import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from "react-native";
import type { Region } from "react-native-maps";
import * as Location from "expo-location";
import { Stack, useRouter } from "expo-router";
import { Feather, Ionicons } from "@expo/vector-icons";

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

type SearchRow = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  type: string;
};

type NominatimHit = {
  place_id: number | string;
  display_name: string;
  lat: string;
  lon: string;
  type?: string;
};

function emojiForPlaceType(type: string): string {
  const t = (type || "").toLowerCase();
  if (t.includes("restaurant")) return "🍽️";
  if (t.includes("cafe") || t.includes("coffee")) return "☕";
  if (t.includes("gym") || t.includes("fitness")) return "🏋️";
  if (t.includes("hospital") || t.includes("clinic")) return "🏥";
  if (t.includes("park") || t.includes("garden")) return "🌳";
  return "📍";
}

function splitDisplayName(displayName: string): { title: string; subtitle: string } {
  const parts = displayName.split(",").map((s) => s.trim()).filter(Boolean);
  if (parts.length === 0) return { title: displayName, subtitle: "" };
  return { title: parts[0], subtitle: parts.slice(1).join(", ") };
}

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
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchRow[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

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

  useEffect(() => {
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, []);

  const runNominatimSearch = useCallback(async (q: string) => {
    const query = q.trim();
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }
    setSearchLoading(true);
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=6&addressdetails=1`;
      const res = await fetch(url, {
        headers: { "User-Agent": "PHPerformance/1.0" },
      });
      const data = (await res.json()) as NominatimHit[];
      setSearchResults(
        data
          .map((p) => ({
            id: String(p.place_id),
            name: p.display_name,
            latitude: parseFloat(p.lat),
            longitude: parseFloat(p.lon),
            type: p.type ?? "",
          }))
          .filter((r) => Number.isFinite(r.latitude) && Number.isFinite(r.longitude)),
      );
    } catch {
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  }, []);

  const onSearchChange = (text: string) => {
    setSearchQuery(text);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => void runNominatimSearch(text), 450);
  };

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

  const onSelectResult = (row: SearchRow) => {
    selectDestination({ latitude: row.latitude, longitude: row.longitude });
    setSearchResults([]);
  };

  const onMapPress = useCallback((e: any) => {
    const c = e?.nativeEvent?.coordinate;
    const lat = c?.latitude;
    const lng = c?.longitude;
    if (typeof lat !== "number" || typeof lng !== "number" || !Number.isFinite(lat) || !Number.isFinite(lng)) return;
    selectDestination({ latitude: lat, longitude: lng });
  }, [selectDestination]);

  const notifEveryMeters = useMemo(() => (notifEnabled ? parseMetersFromInput(notifEveryText) : null), [notifEnabled, notifEveryText]);

  const startRun = useCallback(async () => {
    // Destination mode: goal km is not chosen.
    const goalKm =
      destination
        ? null
        : (() => {
            const v = Number(goalText.trim());
            return Number.isFinite(v) && v > 0 ? Math.min(200, v) : null;
          })();

    // Notifications: ask permission only if enabled.
    let every = notifEveryMeters;
    if (every != null) {
      const ok = await requestRunProgressNotificationPermission();
      if (!ok) {
        const proceed = await new Promise<boolean>((resolve) => {
          Alert.alert(
            "Enable notifications?",
            "To get distance alerts, allow notifications. You can still run without them.",
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

  const glassBg = isDark ? "rgba(20,20,20,0.55)" : "rgba(255,255,255,0.78)";
  const glassBorder = isDark ? "rgba(255,255,255,0.10)" : "rgba(15,23,42,0.10)";

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

        <MapStyleSwitcher value={mapStyle} onChange={setMapStyle} colors={colors} left={14} anchorBottom={14} />

        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            paddingTop: 10,
            paddingHorizontal: spacing.xl,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Pressable
              onPress={() => router.back()}
              style={({ pressed }) => ({
                height: 40,
                paddingHorizontal: 10,
                borderRadius: radius.pill,
                backgroundColor: glassBg,
                borderWidth: 1,
                borderColor: glassBorder,
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                opacity: pressed ? 0.85 : 1,
              })}
            >
              <Feather name="chevron-left" size={18} color={colors.icon} />
              <Text style={{ fontFamily: fonts.bodyMedium, color: colors.textSecondary }}>Back</Text>
            </Pressable>

            <View style={{ alignItems: "center" }}>
              <Text style={{ fontFamily: fonts.heading3, color: colors.textPrimary }}>Run setup</Text>
              <Text style={{ fontFamily: fonts.bodyRegular, fontSize: 12, color: colors.textSecondary }}>
                Destination or goal (optional)
              </Text>
            </View>

            <Pressable
              onPress={() => void startRun()}
              style={({ pressed }) => ({
                height: 40,
                paddingHorizontal: 14,
                borderRadius: radius.pill,
                backgroundColor: colors.accent,
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                opacity: pressed ? 0.9 : 1,
              })}
            >
              <Ionicons name="play" size={16} color={colors.textInverse} />
              <Text style={{ fontFamily: fonts.bodyBold, color: colors.textInverse }}>Start</Text>
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
              paddingTop: 12,
              paddingBottom: 16,
              backgroundColor: glassBg,
              borderTopWidth: 1,
              borderTopColor: glassBorder,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <View style={{ flex: 1 }}>
                <TextInput
                  value={searchQuery}
                  onChangeText={onSearchChange}
                  placeholder="Search destination (optional)"
                  placeholderTextColor={colors.placeholder}
                  style={{
                    height: 44,
                    borderRadius: 16,
                    paddingHorizontal: 14,
                    borderWidth: 1,
                    borderColor: colors.border,
                    backgroundColor: colors.background,
                    color: colors.text,
                    fontFamily: fonts.bodyMedium,
                  }}
                />
              </View>
              <Pressable
                onPress={() => {
                  setSearchQuery("");
                  setSearchResults([]);
                }}
                style={({ pressed }) => ({
                  width: 44,
                  height: 44,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: colors.border,
                  backgroundColor: colors.background,
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: pressed ? 0.9 : 1,
                })}
              >
                <Feather name="x" size={18} color={colors.icon} />
              </Pressable>
            </View>

            {searchLoading ? (
              <View style={{ paddingTop: 10, alignItems: "center" }}>
                <ActivityIndicator />
              </View>
            ) : searchResults.length ? (
              <View style={{ marginTop: 10, maxHeight: 160 }}>
                <ScrollView showsVerticalScrollIndicator={false}>
                  {searchResults.map((r) => {
                    const { title, subtitle } = splitDisplayName(r.name);
                    return (
                      <Pressable
                        key={r.id}
                        onPress={() => onSelectResult(r)}
                        style={({ pressed }) => ({
                          paddingVertical: 10,
                          borderBottomWidth: 1,
                          borderBottomColor: colors.borderSubtle,
                          opacity: pressed ? 0.9 : 1,
                          flexDirection: "row",
                          gap: 10,
                          alignItems: "center",
                        })}
                      >
                        <Text style={{ fontSize: 18 }}>{emojiForPlaceType(r.type)}</Text>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontFamily: fonts.bodyMedium, color: colors.textPrimary }} numberOfLines={1}>
                            {title}
                          </Text>
                          {subtitle ? (
                            <Text style={{ fontFamily: fonts.bodyRegular, fontSize: 12, color: colors.textSecondary }} numberOfLines={1}>
                              {subtitle}
                            </Text>
                          ) : null}
                        </View>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
            ) : null}

            <View style={{ marginTop: 12, gap: 10 }}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <Text style={{ fontFamily: fonts.labelCaps, fontSize: 11, color: colors.textSecondary, letterSpacing: 2 }}>
                  DESTINATION
                </Text>
                {destination ? (
                  <Pressable onPress={() => setDestination(null)}>
                    <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.textSecondary }}>Clear</Text>
                  </Pressable>
                ) : null}
              </View>

              {destination ? (
                <View
                  style={{
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderRadius: 18,
                    padding: 12,
                    backgroundColor: colors.background,
                  }}
                >
                  <Text style={{ fontFamily: fonts.bodyMedium, color: colors.textPrimary }}>Destination selected</Text>
                  <Text style={{ fontFamily: fonts.bodyRegular, fontSize: 12, color: colors.textSecondary, marginTop: 4 }}>
                    {destinationDistanceMeters != null
                      ? `Approx. ${(destinationDistanceMeters / 1000).toFixed(2)} km from your current location`
                      : "Distance unavailable"}
                  </Text>
                  <Text style={{ fontFamily: fonts.bodyRegular, fontSize: 12, color: colors.textSecondary, marginTop: 6 }}>
                    Tap the map to change the destination.
                  </Text>
                </View>
              ) : (
                <Text style={{ fontFamily: fonts.bodyRegular, fontSize: 13, color: colors.textSecondary }}>
                  Optional. Tap the map or search a place.
                </Text>
              )}

              {!destination ? (
                <View style={{ gap: 8 }}>
                  <Text style={{ fontFamily: fonts.labelCaps, fontSize: 11, color: colors.textSecondary, letterSpacing: 2 }}>
                    GOAL (OPTIONAL)
                  </Text>
                  <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
                    <TextInput
                      keyboardType="decimal-pad"
                      value={goalText}
                      onChangeText={setGoalText}
                      placeholder="e.g. 5"
                      placeholderTextColor={colors.placeholder}
                      style={{
                        flex: 1,
                        height: 44,
                        borderRadius: 16,
                        paddingHorizontal: 14,
                        borderWidth: 1,
                        borderColor: colors.border,
                        backgroundColor: colors.background,
                        color: colors.text,
                        fontFamily: fonts.bodyMedium,
                      }}
                    />
                    <View
                      style={{
                        height: 44,
                        paddingHorizontal: 12,
                        borderRadius: 16,
                        borderWidth: 1,
                        borderColor: colors.border,
                        backgroundColor: colors.background,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Text style={{ fontFamily: fonts.bodyMedium, color: colors.textSecondary }}>km</Text>
                    </View>
                  </View>
                </View>
              ) : null}

              <View style={{ gap: 8 }}>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                  <Text style={{ fontFamily: fonts.labelCaps, fontSize: 11, color: colors.textSecondary, letterSpacing: 2 }}>
                    DISTANCE NOTIFICATIONS
                  </Text>
                  <Pressable onPress={() => setNotifEnabled((v) => !v)}>
                    <Text style={{ fontFamily: fonts.bodyBold, fontSize: 12, color: notifEnabled ? colors.accent : colors.textSecondary }}>
                      {notifEnabled ? "ON" : "OFF"}
                    </Text>
                  </Pressable>
                </View>

                {notifEnabled ? (
                  <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
                    <TextInput
                      value={notifEveryText}
                      onChangeText={setNotifEveryText}
                      placeholder="e.g. 1km or 500"
                      placeholderTextColor={colors.placeholder}
                      style={{
                        flex: 1,
                        height: 44,
                        borderRadius: 16,
                        paddingHorizontal: 14,
                        borderWidth: 1,
                        borderColor: colors.border,
                        backgroundColor: colors.background,
                        color: colors.text,
                        fontFamily: fonts.bodyMedium,
                      }}
                    />
                    <Pressable
                      onPress={() => setNotifEveryText("1km")}
                      style={({ pressed }) => ({
                        height: 44,
                        paddingHorizontal: 12,
                        borderRadius: 16,
                        borderWidth: 1,
                        borderColor: colors.border,
                        backgroundColor: colors.background,
                        alignItems: "center",
                        justifyContent: "center",
                        opacity: pressed ? 0.9 : 1,
                      })}
                    >
                      <Text style={{ fontFamily: fonts.bodyMedium, color: colors.textSecondary }}>1km</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => setNotifEveryText("500")}
                      style={({ pressed }) => ({
                        height: 44,
                        paddingHorizontal: 12,
                        borderRadius: 16,
                        borderWidth: 1,
                        borderColor: colors.border,
                        backgroundColor: colors.background,
                        alignItems: "center",
                        justifyContent: "center",
                        opacity: pressed ? 0.9 : 1,
                      })}
                    >
                      <Text style={{ fontFamily: fonts.bodyMedium, color: colors.textSecondary }}>500m</Text>
                    </Pressable>
                  </View>
                ) : (
                  <Text style={{ fontFamily: fonts.bodyRegular, fontSize: 13, color: colors.textSecondary }}>
                    Optional. Get a notification every X meters / km.
                  </Text>
                )}
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </>
  );
}
