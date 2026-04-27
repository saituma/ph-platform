import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
} from "react-native";
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
import { fonts, radius, spacing } from "@/constants/theme";
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

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function RunSummaryScreen() {
  const { height: screenHeight } = useWindowDimensions();
  const MAP_HEIGHT = screenHeight * 0.52;
  const router = useRouter();
  const insets = useAppSafeAreaInsets();
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
        id: currentRunId ?? Crypto.randomUUID(),
        date: new Date().toISOString(),
        distance_meters: finalDistanceMeters,
        duration_seconds: elapsedSeconds,
        avg_pace: Number.isNaN(avg_pace) || !isFinite(avg_pace) ? 0 : avg_pace,
        avg_speed: Number.isNaN(avg_speed) || !isFinite(avg_speed) ? 0 : avg_speed,
        calories: estimateCalories(finalDistanceMeters),
        coordinates: JSON.stringify(coordinates),
        effort_level: effort !== null ? effort * 2 : 0,
        feel_tags: JSON.stringify(
          selectedTags
            .map((st) => FEEL_TAGS.find((t) => t.id === st)?.label)
            .filter(Boolean),
        ),
        notes,
        user_id: userId,
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

  const metrics = calculateRunMetrics(distanceMeters, elapsedSeconds, coordinates, 70);

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
          color: colors.textPrimary,
          backgroundColor: colors.surfaceHigh,
          borderColor: colors.mapRoute,
          text: `${idx + 1}k`,
          fontSize: 10,
        },
      });
    });
    return layers;
  }, [mapCoordinates, splitPoints, colors]);

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

  // Design tokens
  const cardBorder = isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.08)";
  const glassBg = isDark ? "rgba(18,18,18,0.95)" : "rgba(255,255,255,0.98)";
  const accentMuted = `${colors.accent}15`;

  const snapPoints = useMemo(() => ["52%", "90%"], []);

  return (
    <>
      <Stack.Screen options={{ headerShown: false, animation: "fade" }} />
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["top"]}>
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
              <View style={[StyleSheet.absoluteFillObject, { backgroundColor: colors.surfaceHigh }]} />
            )}
          </View>

          {/* Bottom sheet with stats + optional feedback */}
          <BottomSheet
            index={0}
            snapPoints={snapPoints}
            backgroundStyle={{ backgroundColor: glassBg }}
            handleIndicatorStyle={{ backgroundColor: isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.15)", width: 36 }}
            style={{
              shadowColor: "#000",
              shadowOpacity: isDark ? 0.4 : 0.12,
              shadowRadius: 20,
              shadowOffset: { width: 0, height: -8 },
              elevation: 12,
            }}
          >
            <BottomSheetScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{
                paddingHorizontal: spacing.xl,
                paddingTop: 8,
                paddingBottom: insets.bottom + 40,
              }}
            >
              {/* Compact header */}
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 20 }}>
                <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: accentMuted, alignItems: "center", justifyContent: "center" }}>
                  <Trophy size={22} color={colors.accent} strokeWidth={2.5} />
                </View>
                <View>
                  <Text style={{ fontFamily: fonts.accentBold, fontSize: 22, color: colors.textPrimary, letterSpacing: -0.3 }}>
                    Run Complete!
                  </Text>
                  <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.textSecondary }}>
                    Excellent effort today
                  </Text>
                </View>
              </View>

              {/* Hero distance */}
              <View style={{
                backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(15,23,42,0.03)",
                borderColor: cardBorder,
                borderWidth: 1,
                borderRadius: radius.xxl,
                padding: 24,
                alignItems: "center",
                marginBottom: 16,
              }}>
                <Text style={{ fontFamily: fonts.labelCaps, fontSize: 10, color: colors.textSecondary, letterSpacing: 3, marginBottom: 4 }}>
                  TOTAL DISTANCE
                </Text>
                <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 6 }}>
                  <Text style={{ fontFamily: fonts.heroNumber, fontSize: 64, color: colors.textPrimary, letterSpacing: -2, fontVariant: ["tabular-nums"], lineHeight: 68 }}>
                    {distanceMeters === 0 && elapsedSeconds < 2 ? "0.00" : formatDistanceKm(distanceMeters, 2)}
                  </Text>
                  <Text style={{ fontFamily: fonts.labelMedium, fontSize: 16, color: colors.textSecondary, marginBottom: 10, letterSpacing: 1 }}>
                    KM
                  </Text>
                </View>
                <View style={{ marginTop: 8, paddingHorizontal: 12, paddingVertical: 5, backgroundColor: `${metrics.paceZone.color}15`, borderRadius: radius.pill, flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: `${metrics.paceZone.color}30` }}>
                  <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: metrics.paceZone.color, marginRight: 7 }} />
                  <Text style={{ color: metrics.paceZone.color, fontFamily: fonts.accentBold, fontSize: 11 }}>
                    ZONE {metrics.paceZone.zone} · {metrics.paceZone.label.toUpperCase()}
                  </Text>
                </View>
              </View>

              {/* Primary metrics grid */}
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 12 }}>
                <SummaryMetricTile icon={Clock} color={colors.textPrimary} value={formatDurationClock(elapsedSeconds)} label="TIME" />
                <SummaryMetricTile icon={Activity} color={colors.purple} value={metrics.paceMinPerKm} label="MIN/KM" />
                <SummaryMetricTile icon={Zap} color={colors.cyan} value={metrics.speedKmH} label="KM/H" />
                <SummaryMetricTile icon={Flame} color={colors.amber} value={String(metrics.calories)} label="KCAL" />
              </View>

              {/* Secondary metrics */}
              <View style={{ flexDirection: "row", gap: 10, marginBottom: 20 }}>
                {metrics.vo2max && (
                  <View style={{ flex: 1, backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(15,23,42,0.03)", padding: 14, borderRadius: radius.xl, alignItems: "center", borderWidth: 1, borderColor: cardBorder }}>
                    <Text style={{ fontFamily: fonts.labelMedium, fontSize: 9, color: colors.textDim, letterSpacing: 1 }}>VO₂ MAX</Text>
                    <Text style={{ fontFamily: fonts.accentBold, fontSize: 18, color: colors.textPrimary, marginTop: 3 }}>{metrics.vo2max}</Text>
                  </View>
                )}
                <View style={{ flex: 1, backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(15,23,42,0.03)", padding: 14, borderRadius: radius.xl, alignItems: "center", borderWidth: 1, borderColor: cardBorder }}>
                  <Text style={{ fontFamily: fonts.labelMedium, fontSize: 9, color: colors.textDim, letterSpacing: 1 }}>EFFICIENCY</Text>
                  <Text style={{ fontFamily: fonts.accentBold, fontSize: 18, color: colors.textPrimary, marginTop: 3 }}>{metrics.efficiencyScore}%</Text>
                </View>
                {elevationData && (
                  <View style={{ flex: 1, backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(15,23,42,0.03)", padding: 14, borderRadius: radius.xl, alignItems: "center", borderWidth: 1, borderColor: cardBorder }}>
                    <Text style={{ fontFamily: fonts.labelMedium, fontSize: 9, color: colors.textDim, letterSpacing: 1 }}>ELEVATION</Text>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 3 }}>
                      <TrendingUp size={11} color={colors.accent} />
                      <Text style={{ fontFamily: fonts.bodyBold, fontSize: 14, color: colors.textPrimary }}>{elevationData.gain}m</Text>
                    </View>
                  </View>
                )}
              </View>

              {/* Splits */}
              {metrics.splitPaces.length > 0 && (
                <View style={{ marginBottom: 24 }}>
                  <Text style={{ fontFamily: fonts.labelCaps, fontSize: 10, color: colors.textSecondary, letterSpacing: 2, marginBottom: 12, marginLeft: 2 }}>
                    KM SPLITS
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingHorizontal: 2 }}>
                    {metrics.splitPaces.map((splitPace, index) => (
                      <View key={index} style={{ backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(15,23,42,0.03)", paddingHorizontal: 16, paddingVertical: 12, borderRadius: radius.xl, borderWidth: 1, borderColor: cardBorder, minWidth: 88 }}>
                        <Text style={{ fontFamily: fonts.labelMedium, fontSize: 9, color: colors.textDim, marginBottom: 3 }}>KM {index + 1}</Text>
                        <Text style={{ fontFamily: fonts.accentBold, fontSize: 16, color: colors.textPrimary }}>{splitPace}</Text>
                      </View>
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* ── Optional feedback ── */}
              <View style={{ borderTopWidth: 1, borderTopColor: cardBorder, paddingTop: 20, marginBottom: 4 }}>
                <Text style={{ fontFamily: fonts.labelCaps, fontSize: 10, color: colors.textSecondary, letterSpacing: 2, marginBottom: 16 }}>
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
                  placeholderTextColor={colors.placeholder}
                  multiline
                  maxLength={200}
                  textAlignVertical="top"
                  style={{
                    marginTop: 14,
                    backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(15,23,42,0.03)",
                    borderColor: notesFocused ? colors.accent : cardBorder,
                    borderWidth: 1,
                    borderRadius: radius.xl,
                    padding: 14,
                    minHeight: 80,
                    fontFamily: fonts.bodyMedium,
                    fontSize: 15,
                    color: colors.text,
                  }}
                />
              </View>

              {/* Action buttons */}
              <View style={{ gap: 12, marginTop: 24 }}>
                <AnimatedPressable
                  onPress={handleSave}
                  onPressIn={() => (scaleSaveBtn.value = withSpring(0.96, { damping: 15, stiffness: 300 }))}
                  onPressOut={() => (scaleSaveBtn.value = withSpring(1, { damping: 15, stiffness: 300 }))}
                  style={[
                    animatedSaveBtnStyle,
                    {
                      width: "100%",
                      height: 64,
                      backgroundColor: colors.accent,
                      borderRadius: radius.xxl,
                      flexDirection: "row",
                      justifyContent: "center",
                      alignItems: "center",
                      gap: 10,
                      ...(isDark ? {} : { shadowColor: colors.accent, shadowOpacity: 0.3, shadowRadius: 15, shadowOffset: { width: 0, height: 10 }, elevation: 8 }),
                    },
                  ]}
                >
                  <Save size={20} color="#FFF" strokeWidth={2.5} />
                  <Text style={{ fontFamily: fonts.accentBold, fontSize: 18, color: "#FFF" }}>SAVE RUN</Text>
                </AnimatedPressable>

                <Pressable
                  onPress={handleDiscard}
                  style={({ pressed }) => ({
                    height: 52,
                    backgroundColor: "transparent",
                    borderRadius: radius.xxl,
                    borderColor: colors.danger,
                    borderWidth: 1,
                    flexDirection: "row",
                    justifyContent: "center",
                    alignItems: "center",
                    gap: 8,
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <Trash2 size={16} color={colors.danger} />
                  <Text style={{ fontFamily: fonts.accentBold, fontSize: 14, color: colors.danger }}>Discard Session</Text>
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
  const { isDark } = useAppTheme();
  return (
    <View
      style={{
        flex: 1,
        minWidth: "45%",
        backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(15,23,42,0.03)",
        borderRadius: radius.xl,
        padding: 14,
        borderWidth: 1,
        borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.08)",
        alignItems: "center",
      }}
    >
      <Icon size={16} color={color} style={{ marginBottom: 6 }} strokeWidth={2.5} />
      <Text style={{ fontFamily: fonts.heroDisplay, fontSize: 20, color, fontVariant: ["tabular-nums"] }}>{value}</Text>
      <Text style={{ fontFamily: fonts.labelCaps, fontSize: 9, color: "rgba(120,120,130,0.8)", letterSpacing: 1, marginTop: 2 }}>{label}</Text>
    </View>
  );
}
