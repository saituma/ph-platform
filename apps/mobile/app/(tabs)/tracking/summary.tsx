import React, { useEffect, useMemo, useState } from "react";
import { View, Pressable, ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";

import { useRunStore } from "../../../store/useRunStore";
import { Stack, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { 
  Trophy, 
  Clock, 
  Activity, 
  Zap, 
  Flame, 
  Map as MapIcon, 
  ChevronRight, 
  Trash2,
  TrendingUp,
  MapPin,
  TrendingDown
} from "lucide-react-native";
import * as Crypto from "expo-crypto";
import { fonts, radius, spacing } from "@/constants/theme";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Text } from "@/components/ScaledText";
import { calculateRunMetrics, formatDistanceKm, formatDurationClock, estimateCalories } from "../../../lib/tracking/runUtils";
import { thinRoutePointsForDisplay } from "../../../lib/tracking/thinRoute";
import { deleteRunRecord, EFFORT_PENDING_FEEDBACK, initSQLiteRuns, saveRunRecord } from "../../../lib/sqliteRuns";
import { TrackingMetricTile } from "../../../components/tracking/TrackingMetricTile";
import { haversineDistance } from "../../../lib/haversine";
import { TrackingMapView } from "../../../components/tracking/TrackingMapView";
import { MapStyleSwitcher } from "../../../components/tracking/MapStyleSwitcher";
import { BlurView } from "expo-blur";
import type {
  TrackingMapLayer,
  TrackingMapStyle,
} from "../../../components/tracking/trackingMapLayers";
import { trackingScrollBottomPad } from "../../../lib/tracking/mainTabBarInset";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function RunSummaryScreen() {
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

  const persistedThisSummaryRef = React.useRef(false);
  const [mapStyle, setMapStyle] = useState<TrackingMapStyle>("road");

  const mapCoordinates = useMemo(
    () => thinRoutePointsForDisplay(coordinates, 22),
    [coordinates],
  );

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
        avg_speed:
          Number.isNaN(avg_speed) || !isFinite(avg_speed) ? 0 : avg_speed,
        calories: estimateCalories(finalDistanceMeters),
        coordinates: JSON.stringify(coordinates),
        effort_level: EFFORT_PENDING_FEEDBACK,
        feel_tags: "[]",
        notes: "",
      });
      persistedThisSummaryRef.current = true;
    } catch (e) {
      console.warn("[summary] failed to persist run", e);
    }
  }, [
    status,
    currentRunId,
    distanceMeters,
    distanceOverrideMeters,
    elapsedSeconds,
    coordinates,
  ]);

  const opacity = useSharedValue(0);
  const translateY = useSharedValue(24);
  const scaleRateBtn = useSharedValue(1);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 400 });
    translateY.value = withSpring(0, { damping: 20, stiffness: 150 });
  }, []);

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

  const handleSaveAndRate = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    router.replace("/(tabs)/tracking/feedback" as any);
  };

  const metrics = calculateRunMetrics(distanceMeters, elapsedSeconds, coordinates, 70);

  const splitPoints = useMemo(() => {
    const points: Array<{latitude: number; longitude: number; altitude?: number | null}> = [];
    let currentSplitDistance = 0;
    let lastCoord = coordinates.length > 0 ? coordinates[0] : null;

    for (let i = 1; i < coordinates.length; i++) {
       const c = coordinates[i];
       if (lastCoord) {
         currentSplitDistance += haversineDistance(lastCoord.latitude, lastCoord.longitude, c.latitude, c.longitude);
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
        marker: {
          kind: "circle",
          color: colors.mapStart,
          borderColor: "#fff",
          borderWidth: 2,
          size: 8,
        },
      },
      {
        id: "end",
        type: "marker",
        coordinate: pts[pts.length - 1],
        title: "End",
        marker: {
          kind: "circle",
          color: colors.mapEnd,
          borderColor: "#fff",
          borderWidth: 2,
          size: 8,
        },
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

  const animatedScreenStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
    flex: 1,
  }));

  const animatedRateBtnStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleRateBtn.value }],
  }));

  // Design Tokens
  const cardBorder = isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.08)";
  const glassBg = isDark ? "rgba(10,10,10,0.65)" : "rgba(255,255,255,0.72)";
  const accentMuted = `${colors.accent}15`;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      {coordinates.length > 0 && initialRegion ? (
        <>
          <TrackingMapView
            style={StyleSheet.absoluteFillObject}
            initialRegion={initialRegion}
            userInterfaceStyle={isDark ? "dark" : "light"}
            layers={summaryMapLayers}
            fitBounds
            mapStyle={mapStyle}
          />
          <BlurView
            pointerEvents="none"
            intensity={isDark ? 20 : 15}
            tint={isDark ? "dark" : "light"}
            style={StyleSheet.absoluteFillObject}
          />
          <View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFillObject,
              { backgroundColor: isDark ? "rgba(0,0,0,0.2)" : "rgba(255,255,255,0.1)" },
            ]}
          />
        </>
      ) : null}

      <Animated.ScrollView 
        bounces={true} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: spacing.xl,
          paddingTop: 40,
          paddingBottom: trackingScrollBottomPad(insets),
        }}
        style={animatedScreenStyle}
      >
        <View style={{ alignItems: 'center', marginBottom: 40 }}>
          <View style={{ 
            width: 100,
            height: 100,
            borderRadius: 50,
            backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(15,23,42,0.05)",
            borderColor: cardBorder,
            borderWidth: 1,
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: 20,
          }}>
            <Trophy size={48} color={colors.accent} strokeWidth={2} />
          </View>
          <Text
            style={{
              fontFamily: fonts.accentBold,
              fontSize: 36,
              color: colors.textPrimary,
              textAlign: "center",
              letterSpacing: -0.5,
            }}
          >
            Run Complete!
          </Text>
          <Text
            style={{
              fontFamily: fonts.bodyMedium,
              fontSize: 16,
              color: colors.textSecondary,
              marginTop: 6,
            }}
          >
            Excellent effort today
          </Text>
        </View>

        {/* Hero Distance Card */}
        <View style={{ 
          backgroundColor: glassBg, 
          borderColor: cardBorder, 
          borderWidth: 1, 
          borderRadius: radius.xxl, 
          padding: 32, 
          alignItems: 'center', 
          marginBottom: 24,
          ...(isDark ? {} : {
            shadowColor: "#000",
            shadowOpacity: 0.05,
            shadowRadius: 15,
            shadowOffset: { width: 0, height: 8 },
            elevation: 4
          })
        }}>
          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: accentMuted, alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
             <MapIcon size={20} color={colors.accent} />
          </View>
          <Text style={{ fontFamily: fonts.labelCaps, fontSize: 11, color: colors.textSecondary, letterSpacing: 3, marginBottom: 4 }}>TOTAL DISTANCE</Text>
          <Text style={{ fontFamily: fonts.heroNumber, fontSize: 84, color: colors.textPrimary, letterSpacing: -2, fontVariant: ['tabular-nums'] }}>
            {distanceMeters === 0 && elapsedSeconds < 2 ? "0.00" : formatDistanceKm(distanceMeters, 2)}
          </Text>
          <Text
            style={{
              fontFamily: fonts.labelMedium,
              fontSize: 14,
              color: colors.textSecondary,
              marginTop: -8,
              letterSpacing: 1
            }}
          >
            KILOMETERS
          </Text>
          
          <View style={{ marginTop: 24, paddingHorizontal: 16, paddingVertical: 8, backgroundColor: `${metrics.paceZone.color}15`, borderRadius: radius.pill, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: `${metrics.paceZone.color}30` }}>
             <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: metrics.paceZone.color, marginRight: 8 }} />
             <Text style={{ color: metrics.paceZone.color, fontFamily: fonts.accentBold, fontSize: 12 }}>
               ZONE {metrics.paceZone.zone} · {metrics.paceZone.label.toUpperCase()}
             </Text>
          </View>
        </View>

        {/* Primary Metrics Grid */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginBottom: 16 }}>
          <SummaryMetricTile
            icon={Clock}
            color={colors.textPrimary}
            value={formatDurationClock(elapsedSeconds)}
            label="TIME"
          />
          <SummaryMetricTile
            icon={Activity}
            color={colors.purple}
            value={metrics.paceMinPerKm}
            label="MIN/KM"
          />
          <SummaryMetricTile
            icon={Zap}
            color={colors.cyan}
            value={metrics.speedKmH}
            label="KM/H"
          />
          <SummaryMetricTile
            icon={Flame}
            color={colors.amber}
            value={String(metrics.calories)}
            label="KCAL"
          />
        </View>
        
        {/* Secondary Metrics */}
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 32 }}>
          {metrics.vo2max && (
             <View style={{ flex: 1, backgroundColor: glassBg, padding: 16, borderRadius: radius.xl, alignItems: 'center', borderWidth: 1, borderColor: cardBorder }}>
                <Text style={{ fontFamily: fonts.labelMedium, fontSize: 10, color: colors.textDim, letterSpacing: 1 }}>VO₂ MAX</Text>
                <Text style={{ fontFamily: fonts.accentBold, fontSize: 20, color: colors.textPrimary, marginTop: 4 }}>{metrics.vo2max}</Text>
             </View>
          )}
          <View style={{ flex: 1, backgroundColor: glassBg, padding: 16, borderRadius: radius.xl, alignItems: 'center', borderWidth: 1, borderColor: cardBorder }}>
             <Text style={{ fontFamily: fonts.labelMedium, fontSize: 10, color: colors.textDim, letterSpacing: 1 }}>EFFICIENCY</Text>
             <Text style={{ fontFamily: fonts.accentBold, fontSize: 20, color: colors.textPrimary, marginTop: 4 }}>{metrics.efficiencyScore}%</Text>
          </View>
          {elevationData && (
             <View style={{ flex: 1, backgroundColor: glassBg, padding: 16, borderRadius: radius.xl, alignItems: 'center', borderWidth: 1, borderColor: cardBorder }}>
                <Text style={{ fontFamily: fonts.labelMedium, fontSize: 10, color: colors.textDim, letterSpacing: 1 }}>ELEVATION</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                   <TrendingUp size={12} color={colors.accent} />
                   <Text style={{ fontFamily: fonts.bodyBold, fontSize: 14, color: colors.textPrimary }}>{elevationData.gain}m</Text>
                </View>
             </View>
          )}
        </View>

        {/* Splits */}
        {metrics.splitPaces.length > 0 && (
          <View style={{ marginBottom: 32 }}>
             <Text style={{ fontFamily: fonts.labelCaps, fontSize: 11, color: colors.textSecondary, letterSpacing: 2, marginBottom: 16, marginLeft: 4 }}>KM SPLITS</Text>
             <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingHorizontal: 4 }}>
               {metrics.splitPaces.map((splitPace, index) => (
                 <View key={index} style={{ backgroundColor: glassBg, paddingHorizontal: 20, paddingVertical: 14, borderRadius: radius.xl, borderWidth: 1, borderColor: cardBorder, minWidth: 100 }}>
                    <Text style={{ fontFamily: fonts.labelMedium, fontSize: 10, color: colors.textDim, marginBottom: 4 }}>KM {index + 1}</Text>
                    <Text style={{ fontFamily: fonts.accentBold, fontSize: 18, color: colors.textPrimary }}>{splitPace}</Text>
                 </View>
               ))}
             </ScrollView>
          </View>
        )}

        {/* Route Preview */}
        <View style={{ marginBottom: 40 }}>
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 16, marginLeft: 4 }}>
            <MapPin size={14} color={colors.textSecondary} style={{ marginRight: 8 }} />
            <Text style={{ fontFamily: fonts.labelCaps, fontSize: 11, color: colors.textSecondary, letterSpacing: 2 }}>YOUR ROUTE</Text>
          </View>
          <View style={{ height: 240, borderRadius: radius.xxl, borderColor: cardBorder, borderWidth: 1, overflow: 'hidden' }}>
             {coordinates.length > 0 && initialRegion ? (
               <View style={{ flex: 1, position: "relative" }}>
                 <TrackingMapView
                   style={{ flex: 1 }}
                   initialRegion={initialRegion}
                   userInterfaceStyle={isDark ? "dark" : "light"}
                   scrollEnabled
                   zoomEnabled
                   layers={summaryMapLayers}
                   fitBounds
                   mapStyle={mapStyle}
                 />
                 <MapStyleSwitcher
                   value={mapStyle}
                   onChange={setMapStyle}
                   colors={colors}
                   bottomOffset={10}
                   left={12}
                 />
               </View>
             ) : (
               <View style={{ flex: 1, backgroundColor: colors.surfaceHigh }} />
             )}
          </View>
        </View>

        {/* Action Buttons */}
        <View style={{ gap: 16 }}>
          <AnimatedPressable
            onPress={handleSaveAndRate}
            onPressIn={() => (scaleRateBtn.value = withSpring(0.96, { damping: 15, stiffness: 300 }))}
            onPressOut={() => (scaleRateBtn.value = withSpring(1, { damping: 15, stiffness: 300 }))}
            style={[
              animatedRateBtnStyle,
              {
                width: "100%",
                height: 72,
                backgroundColor: colors.accent,
                borderRadius: radius.xxl,
                flexDirection: "row",
                justifyContent: "center",
                alignItems: "center",
                gap: 12,
                ...(isDark ? {} : { shadowColor: colors.accent, shadowOpacity: 0.3, shadowRadius: 15, shadowOffset: { width: 0, height: 10 }, elevation: 8 }),
              },
            ]}
          >
            <Text style={{ fontFamily: fonts.accentBold, fontSize: 20, color: "#FFF" }}>RATE THIS RUN</Text>
            <ChevronRight size={24} color="#FFF" strokeWidth={3} />
          </AnimatedPressable>

          <Pressable
            onPress={handleDiscard}
            style={({ pressed }) => ({
              height: 56,
              backgroundColor: "transparent",
              borderRadius: radius.xxl,
              borderColor: colors.danger,
              borderWidth: 1,
              flexDirection: "row",
              justifyContent: "center",
              alignItems: "center",
              gap: 10,
              opacity: pressed ? 0.7 : 1,
              marginBottom: 20
            })}
          >
            <Trash2 size={18} color={colors.danger} />
            <Text style={{ fontFamily: fonts.accentBold, fontSize: 15, color: colors.danger }}>Discard Session</Text>
          </Pressable>
        </View>
      </Animated.ScrollView>
    </SafeAreaView>
  );
}

function SummaryMetricTile({ icon: Icon, color, value, label }: { icon: any; color: string; value: string; label: string }) {
  const { isDark } = useAppTheme();
  return (
    <View style={{ 
      flex: 1, 
      minWidth: '45%', 
      backgroundColor: isDark ? "rgba(10,10,10,0.65)" : "rgba(255,255,255,0.78)", 
      borderRadius: radius.xl, 
      padding: 16, 
      borderWidth: 1, 
      borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.08)",
      alignItems: 'center'
    }}>
      <Icon size={18} color={color} style={{ marginBottom: 8 }} strokeWidth={2.5} />
      <Text style={{ fontFamily: fonts.heroDisplay, fontSize: 22, color: color, fontVariant: ['tabular-nums'] }}>{value}</Text>
      <Text style={{ fontFamily: fonts.labelCaps, fontSize: 9, color: 'rgba(120,120,130,0.8)', letterSpacing: 1, marginTop: 2 }}>{label}</Text>
    </View>
  );
}
