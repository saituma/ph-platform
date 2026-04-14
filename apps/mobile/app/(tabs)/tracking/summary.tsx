import React, { useEffect, useMemo } from "react";
import { View, Pressable, SafeAreaView, Platform, ScrollView } from "react-native";
import MapView, { Polyline, Marker } from "react-native-maps";

import { useRunStore } from "../../../store/useRunStore";
import { Stack, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { fonts, radius, icons as themeIcons } from "@/constants/theme";
import { PulsingDot } from "../../../components/tracking/PulsingDot";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Text } from "@/components/ScaledText";
import { calculateRunMetrics, formatDistanceKm, formatDurationClock } from "../../../lib/tracking/runUtils";
import { TrackingMetricTile } from "../../../components/tracking/TrackingMetricTile";
import { OsmMapView } from "../../../components/tracking/OsmMapView";
import { shouldUseOsmMap } from "../../../lib/mapsConfig";
import { haversineDistance } from "../../../lib/haversine";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function RunSummaryScreen() {
  const router = useRouter();
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

  const persistedThisSummaryRef = useRef(false);

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
    opacity.value = withTiming(1, { duration: 350 });
    translateY.value = withSpring(0, { damping: 18, stiffness: 200 });
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
    const points: Array<{latitude: number; longitude: number; altitude?: number}> = [];
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

  const useOsmMap = shouldUseOsmMap();
  const useOsmMap = shouldUseOsmMap();

  const animatedScreenStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
    flex: 1,
  }));

  const animatedRateBtnStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleRateBtn.value }],
  }));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <Animated.ScrollView 
        bounces={true} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 40, paddingBottom: 40 }}
        style={animatedScreenStyle}
      >
        <View style={{ alignItems: 'center', marginBottom: 32 }}>
          <View style={{ 
            width: 96,
            height: 96,
            borderRadius: radius.pill,
            backgroundColor: colors.accentLight,
            borderColor: colors.border,
            borderWidth: 1,
            justifyContent: 'center',
            alignItems: 'center',
            ...(isDark ? {} : { shadowColor: colors.accent, shadowOpacity: 0.18, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 6 }),
            marginBottom: 20,
          }}>
            <MaterialCommunityIcons name={themeIcons.medal.name as any} size={56} color={colors.accent} />
          </View>
          <Text
            style={{
              fontFamily: fonts.heroDisplay,
              fontSize: 44,
              color: colors.text,
              letterSpacing: -1,
            }}
          >
            Run Complete!
          </Text>
          <Text
            style={{
              fontFamily: fonts.bodyMedium,
              fontSize: 16,
              color: colors.textSecondary,
              marginTop: 4,
            }}
          >
            You crushed it today
          </Text>
        </View>

        <View style={{ 
          backgroundColor: isDark ? colors.card : colors.cardElevated, 
          borderColor: colors.border, 
          borderWidth: 1, 
          borderRadius: radius.xxl, 
          padding: 24, 
          alignItems: 'center', 
          marginBottom: 24 
        }}>
          <MaterialCommunityIcons name={themeIcons.distance.name as any} size={22} color={colors.accent} style={{ marginBottom: 4 }} />
          <Text style={{ fontFamily: fonts.labelCaps, fontSize: 11, color: colors.textSecondary, letterSpacing: 2.5, marginBottom: -6 }}>TOTAL DISTANCE</Text>
          <Text style={{ fontFamily: fonts.heroNumber, fontSize: 80, color: colors.text, letterSpacing: -2, fontVariant: ['tabular-nums'] }}>
            {distanceMeters === 0 && elapsedSeconds < 2 ? "--" : formatDistanceKm(distanceMeters, 2)}
          </Text>
          <Text
            style={{
              fontFamily: fonts.labelMedium,
              fontSize: 13,
              color: colors.textSecondary,
              marginTop: -8,
            }}
          >
            KILOMETERS
          </Text>
          
          <View style={{ marginTop: 12, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: `${metrics.paceZone.color}22`, borderRadius: radius.full, flexDirection: 'row', alignItems: 'center' }}>
             <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: metrics.paceZone.color, marginRight: 6 }} />
             <Text style={{ color: metrics.paceZone.color, fontFamily: fonts.labelMedium, fontSize: 11, textTransform: 'uppercase' }}>
               Zone {metrics.paceZone.zone} · {metrics.paceZone.label}
             </Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginBottom: 16 }}>
          <TrackingMetricTile
            iconLibrary="Ionicons"
            iconName={themeIcons.timer.name as any}
            iconColor={colors.textPrimary}
            accentColor={colors.textPrimary}
            value={formatDurationClock(elapsedSeconds)}
            bottomLabel="TIME"
          />
          <TrackingMetricTile
            iconLibrary="MaterialCommunityIcons"
            iconName={themeIcons.pace.name as any}
            iconColor={colors.purple}
            accentColor={colors.purple}
            value={metrics.paceMinPerKm}
            valueColor={colors.purple}
            bottomLabel="MIN/KM"
          />
          <TrackingMetricTile
            iconLibrary="Ionicons"
            iconName={themeIcons.speed.name as any}
            iconColor={colors.cyan}
            accentColor={colors.cyan}
            value={metrics.speedKmH}
            valueColor={colors.cyan}
            bottomLabel="KM/H"
          />
          <TrackingMetricTile
            iconLibrary="MaterialCommunityIcons"
            iconName={themeIcons.calories.name as any}
            iconColor={colors.amber}
            accentColor={colors.amber}
            value={String(metrics.calories)}
            valueColor={colors.amber}
            bottomLabel="KCAL"
          />
        </View>
        
        <View style={{ flexDirection: 'row', gap: 16, marginBottom: 32 }}>
          {metrics.vo2max && (
             <View style={{ flex: 1, backgroundColor: colors.surfaceHigh, padding: 12, borderRadius: radius.xl, alignItems: 'center' }}>
                <Text style={{ fontFamily: fonts.labelMedium, fontSize: 11, color: colors.textSecondary }}>VO₂ EST</Text>
                <Text style={{ fontFamily: fonts.heading2, fontSize: 20, color: colors.textPrimary, marginTop: 4 }}>{metrics.vo2max}</Text>
             </View>
          )}
          <View style={{ flex: 1, backgroundColor: colors.surfaceHigh, padding: 12, borderRadius: radius.xl, alignItems: 'center' }}>
             <Text style={{ fontFamily: fonts.labelMedium, fontSize: 11, color: colors.textSecondary }}>EFFICIENCY</Text>
             <Text style={{ fontFamily: fonts.heading2, fontSize: 20, color: colors.textPrimary, marginTop: 4 }}>{metrics.efficiencyScore}%</Text>
          </View>
          {elevationData && (
             <View style={{ flex: 1, backgroundColor: colors.surfaceHigh, padding: 12, borderRadius: radius.xl, alignItems: 'center' }}>
                <Text style={{ fontFamily: fonts.labelMedium, fontSize: 11, color: colors.textSecondary }}>ELEVATION</Text>
                <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.textPrimary, marginTop: 4 }}>
                   ↑ {elevationData.gain}m  ↓ {elevationData.loss}m
                </Text>
             </View>
          )}
        </View>

        {metrics.splitPaces.length > 0 && (
          <View style={{ marginBottom: 32 }}>
             <Text style={{ fontFamily: fonts.labelCaps, fontSize: 11, color: colors.textSecondary, letterSpacing: 2.5, marginBottom: 12, marginLeft: 4 }}>KM SPLITS</Text>
             <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingHorizontal: 4 }}>
               {metrics.splitPaces.map((splitPace, index) => (
                 <View key={index} style={{ backgroundColor: colors.surfaceHigh, paddingHorizontal: 16, paddingVertical: 12, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.borderSubtle }}>
                    <Text style={{ fontFamily: fonts.labelMedium, fontSize: 11, color: colors.textSecondary, marginBottom: 4 }}>KM {index + 1}</Text>
                    <Text style={{ fontFamily: fonts.heading2, fontSize: 18, color: colors.textPrimary }}>{splitPace}</Text>
                 </View>
               ))}
             </ScrollView>
          </View>
        )}

        <View style={{ marginBottom: 32 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 16,
            }}
          >
            <Ionicons
              name={themeIcons.route.name as any}
              size={16}
              color={colors.textSecondary}
              style={{ marginRight: 6 }}
            />
            <Text
              style={{
                fontFamily: fonts.labelCaps,
                fontSize: 11,
                color: colors.textSecondary,
                letterSpacing: 2.5,
              }}
            >
              YOUR ROUTE
            </Text>
          </View>
          <View style={{ height: 220, borderRadius: radius.xxl, borderColor: colors.border, borderWidth: 1, overflow: 'hidden' }}>
             {coordinates.length > 0 ? (
               useOsmMap ? (
                 <OsmMapView
                   coordinates={coordinates}
                   routeColor={colors.mapRoute}
                   startColor={colors.mapStart}
                   endColor={colors.mapEnd}
                   backgroundColor={colors.surfaceHigh}
                   isDark={isDark}
                   splitPoints={splitPoints}
                 />
               ) : (
                 <MapView 
                   style={{ flex: 1 }} 
                   initialRegion={initialRegion} 
                   userInterfaceStyle={isDark ? "dark" : "light"} 
                   scrollEnabled={true} 
                   zoomEnabled={true}
                   provider={Platform.OS === "android" ? "google" : undefined}
                   mapType="standard"
                   showsBuildings={false}
                   customMapStyle={isDark ? (MapNightStyle as any) : ([] as any)} 
                 >
                   <Polyline 
                     coordinates={coordinates.map(c => ({ latitude: c.latitude, longitude: c.longitude }))} 
                     strokeColor={colors.mapRoute} 
                     strokeWidth={4} 
                     geodesic={true}
                   />
                   <Marker coordinate={coordinates[0]}>
                     <PulsingDot size={12} color={colors.mapStart} />
                   </Marker>
                   <Marker coordinate={coordinates[coordinates.length - 1]}>
                     <PulsingDot size={12} color={colors.mapEnd} />
                   </Marker>
                   
                   {splitPoints.map((sp, idx) => (
                      <Marker key={`split-\${idx}`} coordinate={sp} title={`\${idx + 1} km`}>
                        <View style={{
                           backgroundColor: colors.surfaceHigh, borderColor: colors.mapRoute, borderWidth: 1, 
                           borderRadius: 8, paddingHorizontal: 4, paddingVertical: 2
                        }}>
                           <Text style={{ fontSize: 10, fontFamily: fonts.labelMedium, color: colors.textPrimary }}>{idx + 1}k</Text>
                        </View>
                      </Marker>
                   ))}
                 </MapView>
               )
             ) : (
               <View style={{ flex: 1, backgroundColor: colors.surfaceHigh }} />
             )}
          </View>
        </View>

        <View style={{ gap: 16 }}>
          <AnimatedPressable
            onPress={handleSaveAndRate}
            onPressIn={() =>
              (scaleRateBtn.value = withSpring(0.96, {
                damping: 15,
                stiffness: 300,
              }))
            }
            onPressOut={() =>
              (scaleRateBtn.value = withSpring(1, {
                damping: 15,
                stiffness: 300,
              }))
            }
            style={[
              animatedRateBtnStyle,
              {
                width: "100%",
                height: 68,
                backgroundColor: colors.accent,
                borderRadius: radius.xxl,
                flexDirection: "row",
                justifyContent: "center",
                alignItems: "center",
                ...(isDark
                  ? {}
                  : {
                      shadowColor: colors.accent,
                      shadowOpacity: 0.18,
                      shadowRadius: 18,
                      shadowOffset: { width: 0, height: 10 },
                      elevation: 6,
                    }),
              },
            ]}
          >
            <Text
              style={{
                fontFamily: fonts.heading1,
                fontSize: 20,
                color: colors.textInverse,
                marginRight: 8,
                marginTop: 4,
              }}
            >
              RATE THIS RUN
            </Text>
            <Ionicons
              name={themeIcons.chevronRight.name as any}
              size={24}
              color={colors.textInverse}
            />
          </AnimatedPressable>

          <Pressable
            onPress={handleDiscard}
            style={{
              height: 56,
              backgroundColor: "transparent",
              borderRadius: radius.xxl,
              borderColor: colors.dangerSoft,
              borderWidth: 1,
              flexDirection: "row",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Ionicons
              name={themeIcons.discard.name as any}
              size={20}
              color={colors.danger}
              style={{ marginRight: 8 }}
            />
            <Text
              style={{
                fontFamily: fonts.heading3,
                fontSize: 16,
                color: colors.danger,
              }}
            >
              Discard Run
            </Text>
          </Pressable>
        </View>
        </Animated.ScrollView>
      </SafeAreaView>
    </>
  );
}
