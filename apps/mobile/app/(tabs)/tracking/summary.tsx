import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  Platform,
  useWindowDimensions,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import BottomSheet, { BottomSheetScrollView } from "@gorhom/bottom-sheet";

import { useRunStore } from "../../../store/useRunStore";
import { useAppSelector } from "@/store/hooks";
import { Stack, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from "react-native-reanimated";
import {
  Trophy,
  Clock,
  Activity,
  Zap,
  Flame,
  Trash2,
  TrendingUp,
  Save,
} from "lucide-react-native";
import { RunShareCard } from "../../../components/tracking/RunShareCard";
import * as Crypto from "expo-crypto";
import { useAdminPastel } from "@/components/admin/AdminUI";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Text } from "@/components/ScaledText";
import {
  calculateRunMetrics,
  formatDistanceKm,
  formatDurationClock,
  estimateCalories,
} from "../../../lib/tracking/runUtils";
import { thinRoutePointsForDisplay } from "../../../lib/tracking/thinRoute";
import {
  deleteRunRecord,
  EFFORT_PENDING_FEEDBACK,
  initSQLiteRuns,
  saveRunRecord,
  updateRunFeedback,
} from "../../../lib/sqliteRuns";
import { haversineDistance } from "../../../lib/haversine";
import { TrackingMapView } from "../../../components/tracking/TrackingMapView";
import { MapStyleSwitcher } from "../../../components/tracking/MapStyleSwitcher";
import type {
  TrackingMapLayer,
  TrackingMapStyle,
} from "../../../components/tracking/trackingMapLayers";
import { EffortSelector } from "../../../components/tracking/EffortSelector";
import {
  FeelTagSelector,
  FEEL_TAGS,
} from "../../../components/tracking/FeelTagSelector";
import { pushRunsToCloud } from "../../../lib/runSync";

export default function RunSummaryScreen() {
  const { height: screenHeight } = useWindowDimensions();
  const MAP_HEIGHT = screenHeight * 0.52;
  const router = useRouter();
  const insets = useAppSafeAreaInsets();
  const p = useAdminPastel();
  const { colors, isDark } = useAppTheme();
  const {
    distanceMeters,
    distanceOverrideMeters,
    elapsedSeconds,
    coordinates,
    resetRun,
    currentRunId,
    status,
  } = useRunStore();
  const userId = useAppSelector((s) => s.user.profile.id ?? null);

  const persistedThisSummaryRef = useRef(false);
  const [mapStyle, setMapStyle] = useState<TrackingMapStyle>("road");
  const [effort, setEffort] = useState<number | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [notesFocused, setNotesFocused] = useState(false);
  const [showShareCard, setShowShareCard] = useState(false);
  const [savedRunSnapshot, setSavedRunSnapshot] = useState<{
    distanceMeters: number;
    elapsedSeconds: number;
    coordinates: typeof coordinates;
  } | null>(null);

  const mapCoordinates = useMemo(
    () => thinRoutePointsForDisplay(coordinates, 22),
    [coordinates],
  );

  // Persist run to SQLite on first load (with pending effort)
  useEffect(() => {
    if (persistedThisSummaryRef.current) return;
    if (status !== "stopped") return;

    const finalDistanceMeters =
      typeof distanceOverrideMeters === "number"
        ? distanceOverrideMeters
        : distanceMeters;
    if (finalDistanceMeters <= 0 && elapsedSeconds <= 0) return;

    let runId = currentRunId;
    if (!runId) {
      runId = Crypto.randomUUID();
      useRunStore.setState({ currentRunId: runId });
    }

    const distanceKm = finalDistanceMeters / 1000;
    const avg_speed =
      distanceKm > 0 && elapsedSeconds > 0
        ? distanceKm / (elapsedSeconds / 3600)
        : 0;
    const avg_pace =
      distanceKm > 0 && elapsedSeconds > 0
        ? elapsedSeconds / 60 / distanceKm
        : 0;

    try {
      initSQLiteRuns();
      saveRunRecord({
        id: runId,
        date: new Date().toISOString(),
        distance_meters: finalDistanceMeters,
        duration_seconds: elapsedSeconds,
        avg_pace: Number.isNaN(avg_pace) || !isFinite(avg_pace) ? 0 : avg_pace,
        avg_speed: Number.isNaN(avg_speed) || !isFinite(avg_speed) ? 0 : avg_speed,
        calories: estimateCalories(finalDistanceMeters),
        coordinates: JSON.stringify(coordinates),
        effort_level: EFFORT_PENDING_FEEDBACK,
        feel_tags: "[]",
        notes: "",
        user_id: userId,
        sport: null,
      });
      persistedThisSummaryRef.current = true;
    } catch (e) {
      console.warn("[summary] failed to persist run", e);
    }
  }, [status, currentRunId, distanceMeters, distanceOverrideMeters, elapsedSeconds, coordinates]);

  const scaleSaveBtn = useSharedValue(1);

  const animatedSaveBtnStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleSaveBtn.value }],
  }));

  const handleDiscard = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    if (currentRunId) {
      try {
        initSQLiteRuns();
        deleteRunRecord(currentRunId);
      } catch (e) {
        console.warn("[summary] failed to delete pending run", e);
      }
    }
    resetRun();
    router.replace("/(tabs)/tracking" as any);
  };

  const handleSave = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const finalDistanceMeters =
      typeof distanceOverrideMeters === "number"
        ? distanceOverrideMeters
        : distanceMeters;

    try {
      initSQLiteRuns();
      updateRunFeedback(currentRunId ?? "", {
        effort_level: effort !== null ? effort * 2 : 0,
        feel_tags: JSON.stringify(
          selectedTags
            .map((st) => FEEL_TAGS.find((t) => t.id === st)?.label)
            .filter(Boolean),
        ),
        notes,
      });
      pushRunsToCloud();
    } catch (e) {
      console.warn("[summary] failed to save run", e);
    }

    // Snapshot run data then show share card before navigating
    setSavedRunSnapshot({ distanceMeters: finalDistanceMeters, elapsedSeconds, coordinates });
    setShowShareCard(true);
  };

  const handleShareCardClose = () => {
    setShowShareCard(false);
    setSavedRunSnapshot(null);
    resetRun();
    router.replace("/(tabs)/tracking" as any);
  };

  const toggleTag = (id: string) => {
    Haptics.selectionAsync();
    setSelectedTags((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id],
    );
  };

  const finalDistanceMetersDisplay =
    typeof distanceOverrideMeters === "number" ? distanceOverrideMeters : distanceMeters;
  const metrics = calculateRunMetrics(finalDistanceMetersDisplay, elapsedSeconds, coordinates, 70);

  const splitPoints = useMemo(() => {
    const points: Array<{ latitude: number; longitude: number; altitude?: number | null }> = [];
    let currentSplitDistance = 0;
    let lastCoord = coordinates.length > 0 ? coordinates[0] : null;

    for (let i = 1; i < coordinates.length; i++) {
      const c = coordinates[i];
      if (lastCoord) {
        currentSplitDistance += haversineDistance(
          lastCoord.latitude,
          lastCoord.longitude,
          c.latitude,
          c.longitude,
        );
        if (currentSplitDistance >= 1000) {
          points.push(c);
          currentSplitDistance -= 1000;
        }
      }
      lastCoord = c;
    }
    return points;
  }, [coordinates]);

  const summaryMapLayers = useMemo((): TrackingMapLayer[] => {
    if (mapCoordinates.length === 0) return [];
    const pts = mapCoordinates.map((c) => ({
      latitude: c.latitude,
      longitude: c.longitude,
    }));
    const layers: TrackingMapLayer[] = [
      {
        id: "route",
        type: "polyline",
        coordinates: pts,
        strokeColor: colors.mapRoute,
        strokeWidth: 4,
      },
      {
        id: "start",
        type: "marker",
        coordinate: pts[0],
        title: "Start",
        marker: { kind: "circle", color: colors.mapStart, borderColor: "#fff", borderWidth: 2, size: 8 },
      },
      {
        id: "end",
        type: "marker",
        coordinate: pts[pts.length - 1],
        title: "End",
        marker: { kind: "circle", color: colors.mapEnd, borderColor: "#fff", borderWidth: 2, size: 8 },
      },
    ];
    splitPoints.forEach((sp, idx) => {
      layers.push({
        id: `split-${idx}`,
        type: "marker",
        coordinate: { latitude: sp.latitude, longitude: sp.longitude },
        title: `${idx + 1} km`,
        marker: {
          kind: "label",
          color: p.textPrimary,
          backgroundColor: p.cardWhite,
          borderColor: colors.mapRoute,
          text: `${idx + 1}k`,
          fontSize: 10,
        },
      });
    });
    return layers;
  }, [mapCoordinates, splitPoints, colors, p]);

  const elevationData = useMemo(() => {
    if (coordinates.length < 2) return null;
    let gain = 0;
    let loss = 0;
    let lastAlt = coordinates[0].altitude;
    for (const c of coordinates) {
      if (c.altitude != null && lastAlt != null) {
        const diff = c.altitude - lastAlt;
        if (diff > 0) gain += diff;
        else if (diff < 0) loss += Math.abs(diff);
      }
      lastAlt = c.altitude != null ? c.altitude : lastAlt;
    }
    if (gain === 0 && loss === 0) return null;
    return { gain: Math.round(gain), loss: Math.round(loss) };
  }, [coordinates]);

  const initialRegion =
    mapCoordinates.length > 0
      ? {
          latitude: mapCoordinates[0].latitude,
          longitude: mapCoordinates[0].longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }
      : undefined;

  const snapPoints = useMemo(() => ["52%", "90%"], []);

  return (
    <>
      <Stack.Screen options={{ headerShown: false, animation: "fade" }} />
      <SafeAreaView style={{ flex: 1, backgroundColor: p.pageBg }} edges={["top"]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1 }}
        >
          {/* Hero map */}
          <View style={{ height: MAP_HEIGHT }}>
            {coordinates.length > 0 && initialRegion ? (
              <>
                <TrackingMapView
                  style={StyleSheet.absoluteFillObject}
                  initialRegion={initialRegion}
                  userInterfaceStyle={isDark ? "dark" : "light"}
                  layers={summaryMapLayers}
                  fitBounds
                  scrollEnabled
                  zoomEnabled
                  mapStyle={mapStyle}
                />
                <MapStyleSwitcher
                  value={mapStyle}
                  onChange={setMapStyle}
                  colors={colors}
                  bottomOffset={14}
                  left={14}
                />
              </>
            ) : (
              <View style={[StyleSheet.absoluteFillObject, { backgroundColor: p.inputBg }]} />
            )}
          </View>

          {/* Bottom sheet with stats + optional feedback */}
          <BottomSheet
            index={0}
            snapPoints={snapPoints}
            backgroundStyle={{ backgroundColor: p.cardWhite }}
            handleIndicatorStyle={{ backgroundColor: p.divider, width: 36 }}
          >
            <BottomSheetScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{
                paddingHorizontal: 20,
                paddingTop: 8,
                paddingBottom: insets.bottom + 40,
              }}
            >
              {/* Compact header */}
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 20 }}>
                <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: p.accentSoft, alignItems: "center", justifyContent: "center" }}>
                  <Trophy size={22} color={p.accent} strokeWidth={2.5} />
                </View>
                <View>
                  <Text style={{ fontFamily: "Outfit-Bold", fontSize: 22, color: p.textPrimary, letterSpacing: -0.3 }}>
                    Run Complete!
                  </Text>
                  <Text style={{ fontFamily: "Outfit-Regular", fontSize: 13, color: p.textSecondary }}>
                    Excellent effort today
                  </Text>
                </View>
              </View>

              {/* Hero distance */}
              <View style={{
                backgroundColor: p.inputBg,
                borderRadius: 22,
                padding: 24,
                alignItems: "center",
                marginBottom: 16,
              }}>
                <Text style={{ fontFamily: "Outfit-Bold", fontSize: 10, color: p.textSecondary, letterSpacing: 3, marginBottom: 4 }}>
                  TOTAL DISTANCE
                </Text>
                <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 6 }}>
                  <Text style={{ fontFamily: "Outfit-Bold", fontSize: 64, color: p.textPrimary, letterSpacing: -2, fontVariant: ["tabular-nums"], lineHeight: 68 }}>
                    {finalDistanceMetersDisplay === 0 && elapsedSeconds < 2 ? "0.00" : formatDistanceKm(finalDistanceMetersDisplay, 2)}
                  </Text>
                  <Text style={{ fontFamily: "Outfit-Regular", fontSize: 16, color: p.textSecondary, marginBottom: 10, letterSpacing: 1 }}>
                    KM
                  </Text>
                </View>
                <View style={{ marginTop: 8, paddingHorizontal: 12, paddingVertical: 5, backgroundColor: `${metrics.paceZone.color}15`, borderRadius: 100, flexDirection: "row", alignItems: "center" }}>
                  <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: metrics.paceZone.color, marginRight: 7 }} />
                  <Text style={{ color: metrics.paceZone.color, fontFamily: "Outfit-Bold", fontSize: 11 }}>
                    ZONE {metrics.paceZone.zone} · {metrics.paceZone.label.toUpperCase()}
                  </Text>
                </View>
              </View>

              {/* Primary metrics grid */}
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 12 }}>
                <SummaryMetricTile icon={Clock} color={p.textPrimary} value={formatDurationClock(elapsedSeconds)} label="TIME" />
                <SummaryMetricTile icon={Activity} color={p.accent} value={metrics.paceMinPerKm} label="MIN/KM" />
                <SummaryMetricTile icon={Zap} color={p.info} value={metrics.speedKmH} label="KM/H" />
                <SummaryMetricTile icon={Flame} color={p.warning} value={String(metrics.calories)} label="KCAL" />
              </View>

              {/* Secondary metrics */}
              <View style={{ flexDirection: "row", gap: 10, marginBottom: 20 }}>
                {metrics.vo2max && (
                  <View style={{ flex: 1, backgroundColor: p.inputBg, padding: 14, borderRadius: 22, alignItems: "center" }}>
                    <Text style={{ fontFamily: "Outfit-Regular", fontSize: 9, color: p.textMuted, letterSpacing: 1 }}>VO2 MAX</Text>
                    <Text style={{ fontFamily: "Outfit-Bold", fontSize: 18, color: p.textPrimary, marginTop: 3 }}>{metrics.vo2max}</Text>
                  </View>
                )}
                <View style={{ flex: 1, backgroundColor: p.inputBg, padding: 14, borderRadius: 22, alignItems: "center" }}>
                  <Text style={{ fontFamily: "Outfit-Regular", fontSize: 9, color: p.textMuted, letterSpacing: 1 }}>EFFICIENCY</Text>
                  <Text style={{ fontFamily: "Outfit-Bold", fontSize: 18, color: p.textPrimary, marginTop: 3 }}>{metrics.efficiencyScore}%</Text>
                </View>
                {elevationData && (
                  <View style={{ flex: 1, backgroundColor: p.inputBg, padding: 14, borderRadius: 22, alignItems: "center" }}>
                    <Text style={{ fontFamily: "Outfit-Regular", fontSize: 9, color: p.textMuted, letterSpacing: 1 }}>ELEVATION</Text>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 3 }}>
                      <TrendingUp size={11} color={p.accent} />
                      <Text style={{ fontFamily: "Outfit-Bold", fontSize: 14, color: p.textPrimary }}>{elevationData.gain}m</Text>
                    </View>
                  </View>
                )}
              </View>

              {/* Splits */}
              {metrics.splitPaces.length > 0 && (
                <View style={{ marginBottom: 24 }}>
                  <Text style={{ fontFamily: "Outfit-Bold", fontSize: 10, color: p.textSecondary, letterSpacing: 2, marginBottom: 12, marginLeft: 2 }}>
                    KM SPLITS
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingHorizontal: 2 }}>
                    {metrics.splitPaces.map((splitPace, index) => (
                      <View key={index} style={{ backgroundColor: p.inputBg, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 22, minWidth: 88 }}>
                        <Text style={{ fontFamily: "Outfit-Regular", fontSize: 9, color: p.textMuted, marginBottom: 3 }}>KM {index + 1}</Text>
                        <Text style={{ fontFamily: "Outfit-Bold", fontSize: 16, color: p.textPrimary }}>{splitPace}</Text>
                      </View>
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* Optional feedback */}
              <View style={{ borderTopWidth: 1, borderTopColor: p.divider, paddingTop: 20, marginBottom: 4 }}>
                <Text style={{ fontFamily: "Outfit-Bold", fontSize: 10, color: p.textSecondary, letterSpacing: 2, marginBottom: 16 }}>
                  HOW DID IT GO? (OPTIONAL)
                </Text>

                <EffortSelector
                  value={effort ?? 0}
                  onChange={(val) => {
                    Haptics.selectionAsync();
                    setEffort(val);
                  }}
                />

                <View style={{ marginTop: 16 }}>
                  <FeelTagSelector selectedKeys={selectedTags} onToggle={toggleTag} />
                </View>

                <TextInput
                  value={notes}
                  onChangeText={setNotes}
                  onFocus={() => setNotesFocused(true)}
                  onBlur={() => setNotesFocused(false)}
                  placeholder="Add a note..."
                  placeholderTextColor={p.textMuted}
                  multiline
                  maxLength={200}
                  textAlignVertical="top"
                  style={{
                    marginTop: 14,
                    backgroundColor: p.inputBg,
                    borderColor: notesFocused ? p.accent : p.divider,
                    borderWidth: 1,
                    borderRadius: 16,
                    padding: 14,
                    minHeight: 80,
                    fontFamily: "Outfit-Regular",
                    fontSize: 15,
                    color: p.textPrimary,
                  }}
                />
              </View>

              {/* Action buttons */}
              <View style={{ gap: 12, marginTop: 24 }}>
                <GestureDetector gesture={
                  Gesture.Tap()
                    .onBegin(() => {
                      'worklet';
                      scaleSaveBtn.value = withSpring(0.96, { damping: 15, stiffness: 400, mass: 0.3 });
                      runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Light);
                    })
                    .onFinalize(() => {
                      'worklet';
                      scaleSaveBtn.value = withSpring(1, { damping: 20, stiffness: 300, mass: 0.4 });
                    })
                    .onEnd(() => {
                      'worklet';
                      runOnJS(handleSave)();
                    })
                }>
                  <Animated.View
                    style={[
                      animatedSaveBtnStyle,
                      {
                        width: "100%",
                        height: 64,
                        backgroundColor: p.accent,
                        borderRadius: 100,
                        flexDirection: "row",
                        justifyContent: "center",
                        alignItems: "center",
                        gap: 10,
                      },
                    ]}
                  >
                    <Save size={20} color={p.buttonPrimaryText} strokeWidth={2.5} />
                    <Text style={{ fontFamily: "Outfit-Bold", fontSize: 18, color: p.buttonPrimaryText }}>SAVE RUN</Text>
                  </Animated.View>
                </GestureDetector>

                <Pressable
                  onPress={handleDiscard}
                  style={({ pressed }) => ({
                    height: 52,
                    backgroundColor: p.dangerSoft,
                    borderRadius: 100,
                    flexDirection: "row",
                    justifyContent: "center",
                    alignItems: "center",
                    gap: 8,
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <Trash2 size={16} color={p.danger} />
                  <Text style={{ fontFamily: "Outfit-Bold", fontSize: 14, color: p.danger }}>Discard Session</Text>
                </Pressable>
              </View>
            </BottomSheetScrollView>
          </BottomSheet>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {savedRunSnapshot && (
        <RunShareCard
          visible={showShareCard}
          distanceMeters={savedRunSnapshot.distanceMeters}
          elapsedSeconds={savedRunSnapshot.elapsedSeconds}
          coordinates={savedRunSnapshot.coordinates}
          onClose={handleShareCardClose}
        />
      )}
    </>
  );
}

function SummaryMetricTile({
  icon: Icon,
  color,
  value,
  label,
}: {
  icon: any;
  color: string;
  value: string;
  label: string;
}) {
  const p = useAdminPastel();
  return (
    <View
      style={{
        flex: 1,
        minWidth: "45%",
        backgroundColor: p.inputBg,
        borderRadius: 22,
        padding: 14,
        alignItems: "center",
      }}
    >
      <Icon size={16} color={color} style={{ marginBottom: 6 }} strokeWidth={2.5} />
      <Text style={{ fontFamily: "Outfit-Bold", fontSize: 20, color, fontVariant: ["tabular-nums"] }}>{value}</Text>
      <Text style={{ fontFamily: "Outfit-Regular", fontSize: 9, color: p.textMuted, letterSpacing: 1, marginTop: 2 }}>{label}</Text>
    </View>
  );
}
