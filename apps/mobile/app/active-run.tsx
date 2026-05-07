import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Pressable, ActivityIndicator, BackHandler, Alert } from "react-native";
import { Text } from "@/components/ScaledText";
import * as Crypto from "expo-crypto";
import { EFFORT_PENDING_FEEDBACK, initSQLiteRuns, saveRunRecord } from "@/lib/sqliteRuns";
import { estimateCalories } from "@/lib/tracking/runUtils";
import { pushRunsToCloud } from "@/lib/runSync";
import { announceRunComplete } from "@/lib/tracking/audioCues";
import { RunShareCard } from "@/components/tracking/RunShareCard";
import { useAppSelector } from "@/store/hooks";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { useRouter, Stack, useFocusEffect } from "expo-router";
import * as Haptics from "expo-haptics";
import { ChevronDown, RefreshCw, Clock, Navigation2, X } from "lucide-react-native";
import Animated, {
  useAnimatedStyle,
  withSpring,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useAdminPastel } from "@/components/admin/AdminUI";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { useTabVisibility } from "@/context/TabVisibilityContext";
import { useRunStore } from "@/store/useRunStore";
import {
  stopLocationTracking,
  startLocationTracking,
  refreshRunNotification,
} from "@/lib/backgroundTask";

import { useRunTrackingEngine } from "@/hooks/tracking/useRunTrackingEngine";
import { LiveMap } from "@/components/tracking/active-run/LiveMap";
import { RunToast } from "@/components/tracking/active-run/RunToast";
import {
  getRunBackgroundTrackingDefault,
  getOsrmRoutingDefault,
  getAutoPauseDefault,
  getAudioCuesDefault,
  setAutoPauseDefault,
  setAudioCuesDefault,
} from "@/lib/runTrackingPreferences";
import type { TrackingMapStyle } from "@/components/tracking/trackingMapLayers";
import { ActiveRunSheet, type ActiveRunSheetIndex } from "@/components/tracking/active-run/ActiveRunSheet";
import { ActiveRunMapControls } from "@/components/tracking/active-run/ActiveRunMapControls";
import { ActiveRunStatsCard } from "@/components/tracking/active-run/ActiveRunStatsCard";
import { ActiveRunActionDock } from "@/components/tracking/active-run/ActiveRunActionDock";
import { ActiveRunLayersSheet, type ActiveRunLayersSheetIndex } from "@/components/tracking/active-run/ActiveRunLayersSheet";
import { ActiveRunExpandedView } from "@/components/tracking/active-run/ActiveRunExpandedView";
import { ActiveRunSportSheet, type SportId } from "@/components/tracking/active-run/ActiveRunSportSheet";
import { ActiveRunStartSheet } from "@/components/tracking/active-run/ActiveRunStartSheet";
import { haversineDistance } from "@/lib/haversine";

export default function ActiveRunScreen() {
  const router = useRouter();
  const p = useAdminPastel();
  const { colors, isDark } = useAppTheme();
  const insets = useAppSafeAreaInsets();
  const { setIsTabBarVisible } = useTabVisibility();
  const userId = useAppSelector((s) => s.user.profile.id ?? null);
  const hasStartedRef = React.useRef(false);
  const trackingActiveRef = React.useRef(false);
  const status = useRunStore((s) => s.status);
  const destination = useRunStore((s) => s.destination);
  const startRun = useRunStore((s) => s.startRun);
  const pauseRun = useRunStore((s) => s.pauseRun);
  const resumeRun = useRunStore((s) => s.resumeRun);
  const stopRun = useRunStore((s) => s.stopRun);
  const resetRun = useRunStore((s) => s.resetRun);
  const setDestination = useRunStore((s) => s.setDestination);

  const [backgroundTrackingEnabled, setBackgroundTrackingEnabled] =
    useState(false);
  const [osrmRoutingEnabled, setOsrmRoutingEnabled] = useState(false);
  const [autoPauseEnabled, setAutoPauseEnabled] = useState(true);
  const [audioCuesEnabled, setAudioCuesEnabled] = useState(true);
  const [mapStyle, setMapStyle] = useState<TrackingMapStyle>("road");
  const [sheetIndex, setSheetIndex] = useState<ActiveRunSheetIndex>(-1);
  const [layersSheetIndex, setLayersSheetIndex] = useState<ActiveRunLayersSheetIndex>(-1);
  const [pointsOfInterestEnabled, setPointsOfInterestEnabled] = useState(true);
  const [showRunSheetHint, setShowRunSheetHint] = useState(true);
  const [expandedStats, setExpandedStats] = useState(false);
  const [sportSheetOpen, setSportSheetOpen] = useState(false);
  const [startSheetOpen, setStartSheetOpen] = useState(false);
  const [selectedSport, setSelectedSport] = useState<SportId>("run");
  const [shareCardData, setShareCardData] = useState<{
    distanceMeters: number;
    elapsedSeconds: number;
    coordinates: { latitude: number; longitude: number; timestamp: number; altitude?: number | null }[];
  } | null>(null);
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(24);
  const toastTranslateY = useSharedValue(-120);

  const {
    hasGps,
    gpsError,
    followUser,
    setFollowUser,
    initialRegion,
    toastMessage,
    stopForegroundWatch,
    setupLocationAndPermissions,
    routePolyline,
    routeMetrics,
    isFetchingRoute,
    isWarmedUp,
    recordMapInteraction,
  } = useRunTrackingEngine(toastTranslateY, insets.top, {
    osrmRoutingEnabled,
    autoPauseEnabled,
    audioCuesEnabled,
  });

  const bottomSafeInset = Math.max(insets.bottom, 12);
  const showWarmupBanner = !isWarmedUp && status === "running";

  const activeRunScreenOptions = useMemo(
    () => ({
      headerShown: false as const,
      presentation: "fullScreenModal" as const,
      animation: "fade" as const,
      gestureEnabled: status !== "running" && status !== "paused",
    }),
    [status],
  );

  useEffect(() => {
    requestAnimationFrame(() => setIsTabBarVisible(false));
    return () => {
      setIsTabBarVisible(true);
    };
  }, [setIsTabBarVisible]);

  // Intercept Android hardware back during an active run.
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (status === "running" || status === "paused") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        Alert.alert(
          "Leave run?",
          "If you leave now your run data won't be saved. End your run properly to keep it.",
          [
            { text: "Stay", style: "cancel" },
            {
              text: "Leave anyway",
              style: "destructive",
              onPress: () => {
                resetRun();
                router.replace("/(tabs)/tracking" as any);
              },
            },
          ],
        );
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [status, resetRun, router]);

  useFocusEffect(
    useCallback(() => {
      if (hasStartedRef.current && status !== "running" && status !== "paused" && !shareCardData) {
        router.replace("/(tabs)/tracking" as any);
      }
    }, [status, router, shareCardData]),
  );

  useEffect(() => {
    let active = true;
    (async () => {
      const [bg, osrm, ap, ac] = await Promise.all([
        getRunBackgroundTrackingDefault(),
        getOsrmRoutingDefault(),
        getAutoPauseDefault(),
        getAudioCuesDefault(),
      ]);
      if (!active) return;
      setBackgroundTrackingEnabled(bg);
      setOsrmRoutingEnabled(osrm);
      setAutoPauseEnabled(ap);
      setAudioCuesEnabled(ac);
    })().catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (status !== "running") return;
    const interval = setInterval(() => {
      void refreshRunNotification();
    }, 5000);
    return () => clearInterval(interval);
  }, [status]);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 400 });
    translateY.value = withSpring(0, { damping: 20, stiffness: 150 });

    return () => {
      stopForegroundWatch();
      stopLocationTracking();
    };
  }, [stopForegroundWatch]);

  useEffect(() => {
    if (!hasGps || !backgroundTrackingEnabled) return;
    const shouldBeActive = status === "running" || status === "paused";
    if (shouldBeActive && !trackingActiveRef.current) {
      trackingActiveRef.current = true;
      startLocationTracking().catch(() => null);
    } else if (!shouldBeActive && trackingActiveRef.current) {
      trackingActiveRef.current = false;
      stopLocationTracking().catch(() => null);
    }
  }, [backgroundTrackingEnabled, hasGps, status]);


  const handleFinishRun = () => {
    setExpandedStats(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    stopRun();

    const snap = useRunStore.getState();
    const finalDistance = snap.distanceMeters;
    const finalSeconds = snap.elapsedSeconds;
    const finalCoords = snap.coordinates;
    const finalRunId = snap.currentRunId;

    const distanceKm = finalDistance / 1000;
    const avg_speed = distanceKm > 0 && finalSeconds > 0 ? distanceKm / (finalSeconds / 3600) : 0;
    const avg_pace = distanceKm > 0 && finalSeconds > 0 ? finalSeconds / 60 / distanceKm : 0;

    try {
      initSQLiteRuns();
      saveRunRecord({
        id: finalRunId ?? Crypto.randomUUID(),
        date: new Date().toISOString(),
        distance_meters: finalDistance,
        duration_seconds: finalSeconds,
        avg_pace: Number.isFinite(avg_pace) ? avg_pace : 0,
        avg_speed: Number.isFinite(avg_speed) ? avg_speed : 0,
        calories: estimateCalories(finalDistance),
        coordinates: JSON.stringify(finalCoords),
        effort_level: EFFORT_PENDING_FEEDBACK,
        feel_tags: "[]",
        notes: "",
        user_id: userId,
        sport: selectedSport,
      });
      pushRunsToCloud();
    } catch (e) {
      console.warn("[active-run] failed to save run", e);
    }

    setShareCardData({ distanceMeters: finalDistance, elapsedSeconds: finalSeconds, coordinates: finalCoords });
    if (audioCuesEnabled) {
      announceRunComplete(finalDistance, finalSeconds);
    }
  };

  const handleShareCardClose = () => {
    setShareCardData(null);
    resetRun();
    router.replace("/(tabs)/tracking" as any);
  };

  const screenStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
    flex: 1,
    backgroundColor: p.pageBg,
  }));

  const toastStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: toastTranslateY.value }],
  }));

  const handleManualMove = useCallback(() => {
    setFollowUser(false);
    recordMapInteraction();
  }, [recordMapInteraction]);
  const handleMapPress = useCallback((coord: { latitude: number; longitude: number }) => {
    const dest = useRunStore.getState().destination;
    if (dest) {
      const dLat = Math.abs(coord.latitude - dest.latitude);
      const dLng = Math.abs(coord.longitude - dest.longitude);
      if (dLat < 0.0005 && dLng < 0.0005) {
        setDestination(null);
        return;
      }
    }
    setDestination(coord);
    setSheetIndex(-1);
  }, [setDestination]);

  if (!hasGps) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: p.pageBg,
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 40,
        }}
      >
        <View style={{ width: 100, height: 100, borderRadius: 50, backgroundColor: p.warningSoft, alignItems: "center", justifyContent: "center", marginBottom: 24 }}>
           <ActivityIndicator size="large" color={p.warning} />
        </View>
        <Text
          style={{
            fontFamily: "Outfit-Bold",
            fontSize: 22,
            color: p.textPrimary,
            textAlign: "center",
            marginBottom: 8,
          }}
        >
          {gpsError ? "GPS Error" : "Acquiring GPS..."}
        </Text>
        <Text style={{ fontFamily: "Outfit-Regular", fontSize: 15, color: p.textSecondary, textAlign: "center", lineHeight: 22 }}>
          {gpsError ?? "We need a strong GPS signal to track your run accurately. Please move to an open area."}
        </Text>
        {gpsError && (
          <Pressable
            onPress={() => setupLocationAndPermissions()}
            style={({ pressed }) => ({
              marginTop: 32,
              paddingHorizontal: 24,
              paddingVertical: 14,
              borderRadius: 100,
              backgroundColor: p.accent,
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              opacity: pressed ? 0.9 : 1,
            })}
          >
            <RefreshCw size={18} color={p.buttonPrimaryText} strokeWidth={2.5} />
            <Text
              style={{
                fontFamily: "Outfit-Bold",
                fontSize: 15,
                color: p.buttonPrimaryText,
              }}
            >
              Try again
            </Text>
          </Pressable>
        )}
      </View>
    );
  }

  const handlePrimaryPress = () => {
    if (status === "running") {
      pauseRun();
      return;
    }
    if (status === "paused") {
      resumeRun();
      return;
    }
    if (status === "idle") {
      setStartSheetOpen(true);
      return;
    }
  };

  const showRunDock = sheetIndex === -1 && layersSheetIndex === -1;
  const controlsBottom =
    layersSheetIndex >= 0
      ? bottomSafeInset + 336
      : sheetIndex >= 0
        ? bottomSafeInset + 336
        : bottomSafeInset + 270;

  return (
    <>
      <Stack.Screen options={activeRunScreenOptions} />
      <SafeAreaView style={{ flex: 1, backgroundColor: p.pageBg }}>
        <Animated.View style={screenStyle}>
        <LiveMap
          initialRegion={initialRegion}
          isDark={isDark}
          colors={colors}
          followUser={followUser}
          routePolyline={routePolyline}
          onManualMove={handleManualMove}
          mapStyle={mapStyle}
          showsPointsOfInterest={pointsOfInterestEnabled}
          onPress={handleMapPress}
        />

        {/* Top-left exit */}
        <View style={{ position: "absolute", left: 14, top: insets.top + 6, zIndex: 40 }}>
          <Pressable
            onPress={() => {
              if (status === "running" || status === "paused") {
                setSheetIndex(0);
                setLayersSheetIndex(-1);
                return;
              }
              router.replace("/(tabs)/tracking" as any);
            }}
            style={({ pressed }) => ({
              width: 54,
              height: 54,
              borderRadius: 27,
              backgroundColor: p.cardWhite,
              alignItems: "center",
              justifyContent: "center",
              opacity: pressed ? 0.9 : 1,
            })}
          >
            <ChevronDown size={26} color={p.textPrimary} strokeWidth={2.5} />
          </Pressable>
        </View>

        {/* Map controls stack */}
        <ActiveRunMapControls
          colors={colors}
          isDark={isDark}
          bottom={controlsBottom}
          onOpenLayers={() => {
            setSheetIndex(-1);
            setLayersSheetIndex(0);
          }}
          onRecenter={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setFollowUser(true);
          }}
        />

        {showWarmupBanner && (
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              left: 16,
              top: insets.top + 70,
              right: 80,
              paddingHorizontal: 14,
              paddingVertical: 10,
              borderRadius: 22,
              backgroundColor: p.cardWhite,
              flexDirection: "row",
              gap: 10,
              alignItems: "center",
            }}
          >
            <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: p.accentSoft, alignItems: "center", justifyContent: "center" }}>
               <Clock size={17} color={p.accent} strokeWidth={2.5} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: "Outfit-Bold", fontSize: 12, color: p.textPrimary }}>
                GPS STABILIZING...
              </Text>
              <Text style={{ fontFamily: "Outfit-Regular", fontSize: 10, color: p.textSecondary }}>
                Stand still for best accuracy
              </Text>
            </View>
          </View>
        )}


        {sheetIndex >= 1 && layersSheetIndex === -1 && showRunSheetHint ? (
          <View
            style={{
              position: "absolute",
              left: 22,
              right: 22,
              bottom: bottomSafeInset + 430,
              zIndex: 45,
              alignItems: "center",
            }}
          >
            <View
              style={{
                width: "100%",
                backgroundColor: p.cardWhite,
                borderRadius: 22,
                paddingHorizontal: 18,
                paddingVertical: 16,
                flexDirection: "row",
                alignItems: "flex-start",
                gap: 10,
              }}
            >
              <Text
                style={{
                  flex: 1,
                  fontFamily: "Outfit-Regular",
                  fontSize: 16,
                  lineHeight: 22,
                  color: p.textPrimary,
                }}
              >
                Share location, change sports, and edit settings right here.
              </Text>
              <Pressable
                onPress={() => setShowRunSheetHint(false)}
                accessibilityLabel="Dismiss hint"
                accessibilityRole="button"
                style={{ padding: 2 }}
              >
                <X size={26} color={p.textMuted} strokeWidth={2} />
              </Pressable>
            </View>
            <View
              style={{
                width: 22,
                height: 22,
                backgroundColor: p.cardWhite,
                transform: [{ rotate: "45deg" }],
                marginTop: -11,
              }}
            />
          </View>
        ) : null}

        {destination ? (
          <DestinationBanner
            destination={destination}
            routeMetrics={routeMetrics}
            isFetchingRoute={isFetchingRoute}
            osrmRoutingEnabled={osrmRoutingEnabled}
            showWarmupBanner={showWarmupBanner}
            insetsTop={insets.top}
            p={p}
          />
        ) : null}

        {showRunDock ? (
          <View
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 30,
            }}
          >
            <ActiveRunStatsCard
              sportName={selectedSport}
              onExpandPress={() => setExpandedStats(true)}
              onSportPress={() => setSportSheetOpen(true)}
            />
            <ActiveRunActionDock
              status={status}
              colors={colors}
              isDark={isDark}
              onPrimaryPress={handlePrimaryPress}
              onFinishRun={handleFinishRun}
              bottomInset={bottomSafeInset}
            />
          </View>
        ) : null}

        <ActiveRunSheet
          index={sheetIndex}
          setIndex={setSheetIndex}
          status={status}
          colors={colors}
          isDark={isDark}
          mainTabBarOverlap={bottomSafeInset}
          onPrimaryPress={handlePrimaryPress}
          onShareLiveLocation={() => {
            const current = useRunStore.getState().shareLiveLocationEnabled;
            useRunStore.getState().setShareLiveLocationEnabled(!current);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          }}
          onFinishRun={handleFinishRun}
          onIndexChange={(i) => setSheetIndex(i)}
          autoPauseEnabled={autoPauseEnabled}
          onToggleAutoPause={() => {
            const next = !autoPauseEnabled;
            setAutoPauseEnabled(next);
            setAutoPauseDefault(next).catch(() => {});
            if (!next) {
              useRunStore.getState().setAutoPaused(false);
              useRunStore.getState().setAutoPauseStillSince(null);
            }
          }}
          audioCuesEnabled={audioCuesEnabled}
          onToggleAudioCues={() => {
            const next = !audioCuesEnabled;
            setAudioCuesEnabled(next);
            setAudioCuesDefault(next).catch(() => {});
          }}
        />

        <ActiveRunLayersSheet
          index={layersSheetIndex}
          setIndex={(next) => {
            setLayersSheetIndex(next);
            if (next >= 0) {
              setSheetIndex(-1);
            }
          }}
          mapStyle={mapStyle}
          onChangeMapStyle={setMapStyle}
          pointsOfInterestEnabled={pointsOfInterestEnabled}
          onTogglePointsOfInterest={() =>
            setPointsOfInterestEnabled((current) => !current)
          }
          colors={colors}
          isDark={isDark}
          bottomInset={bottomSafeInset}
        />

        <RunToast
          message={toastMessage}
          toastStyle={toastStyle}
          colors={colors}
        />
        </Animated.View>
      </SafeAreaView>

      <ActiveRunStartSheet
        open={startSheetOpen}
        onSelect={(sport) => {
          setSelectedSport(sport);
          setStartSheetOpen(false);
          hasStartedRef.current = true;
          startRun();
        }}
        onClose={() => setStartSheetOpen(false)}
        colors={colors}
      />

      <ActiveRunSportSheet
        open={sportSheetOpen}
        selectedSport={selectedSport}
        onSelect={(sport) => {
          setSelectedSport(sport);
          setSportSheetOpen(false);
        }}
        onClose={() => setSportSheetOpen(false)}
        colors={colors}
      />

      {expandedStats && (
        <ActiveRunExpandedView
          colors={colors}
          onCollapse={() => setExpandedStats(false)}
          onPrimaryPress={handlePrimaryPress}
          onFinishRun={handleFinishRun}
          bottomInset={bottomSafeInset}
        />
      )}

      {shareCardData && (
        <RunShareCard
          visible={!!shareCardData}
          distanceMeters={shareCardData.distanceMeters}
          elapsedSeconds={shareCardData.elapsedSeconds}
          coordinates={shareCardData.coordinates}
          onClose={handleShareCardClose}
        />
      )}
    </>
  );
}

function DestinationBanner({
  destination,
  routeMetrics,
  isFetchingRoute,
  osrmRoutingEnabled,
  showWarmupBanner,
  insetsTop,
  p,
}: {
  destination: { latitude: number; longitude: number };
  routeMetrics: { durationSec: number; distanceM: number } | null;
  isFetchingRoute: boolean;
  osrmRoutingEnabled: boolean;
  showWarmupBanner: boolean;
  insetsTop: number;
  p: ReturnType<typeof import("@/components/admin/AdminUI").useAdminPastel>;
}) {
  const liveCoord = useRunStore((s) => s.liveCoordinate);
  const straightLineM =
    liveCoord
      ? haversineDistance(
          liveCoord.latitude,
          liveCoord.longitude,
          destination.latitude,
          destination.longitude,
        )
      : null;

  const useRoute = osrmRoutingEnabled && routeMetrics && !isFetchingRoute;
  const distLabel = useRoute
    ? `${(routeMetrics!.distanceM / 1000).toFixed(2)} KM`
    : straightLineM != null
      ? straightLineM >= 1000
        ? `${(straightLineM / 1000).toFixed(2)} KM`
        : `${Math.round(straightLineM)} M`
      : null;
  const etaLabel = useRoute
    ? `${Math.max(1, Math.round(routeMetrics!.durationSec / 60))} MIN`
    : null;

  return (
    <View
      pointerEvents="none"
      style={{
        position: "absolute",
        left: 16,
        right: 80,
        top: showWarmupBanner ? insetsTop + 150 : insetsTop + 70,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 22,
        backgroundColor: p.cardWhite,
        opacity: 0.95,
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
      }}
    >
      {isFetchingRoute ? (
        <ActivityIndicator size="small" color={p.accent} />
      ) : (
        <Navigation2 size={14} color={p.accent} strokeWidth={2.5} />
      )}
      <Text style={{ fontFamily: "Outfit-Bold", fontSize: 12, color: p.textSecondary }}>
        {isFetchingRoute
          ? "CALCULATING..."
          : etaLabel
            ? `${distLabel} · EST. ${etaLabel}`
            : distLabel ?? "DESTINATION SET"}
      </Text>
    </View>
  );
}
