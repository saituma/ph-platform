import React, { useCallback, useEffect, useState } from "react";
import { View, Pressable, ActivityIndicator, BackHandler, Alert } from "react-native";
import { Text } from "@/components/ScaledText";
import * as Crypto from "expo-crypto";
import { EFFORT_PENDING_FEEDBACK, initSQLiteRuns, saveRunRecord } from "../../../lib/sqliteRuns";
import { estimateCalories } from "../../../lib/tracking/runUtils";
import { pushRunsToCloud } from "../../../lib/runSync";
import { announceRunComplete } from "../../../lib/tracking/audioCues";
import { RunShareCard } from "../../../components/tracking/RunShareCard";
import { useAppSelector } from "@/store/hooks";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { useRouter, Stack, useFocusEffect } from "expo-router";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  withSpring,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { fonts, radius } from "@/constants/theme";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { useTabVisibility } from "@/context/TabVisibilityContext";
import { useRunStore } from "../../../store/useRunStore";
import {
  stopLocationTracking,
  startLocationTracking,
  refreshRunNotification,
} from "../../../lib/backgroundTask";

import { useRunTrackingEngine } from "../../../hooks/tracking/useRunTrackingEngine";
import { LiveMap } from "../../../components/tracking/active-run/LiveMap";
import { RunToast } from "../../../components/tracking/active-run/RunToast";
import {
  getRunBackgroundTrackingDefault,
  getOsrmRoutingDefault,
  getAutoPauseDefault,
  getAudioCuesDefault,
  setAutoPauseDefault,
  setAudioCuesDefault,
} from "../../../lib/runTrackingPreferences";
import type { TrackingMapStyle } from "../../../components/tracking/trackingMapLayers";
import { ActiveRunSheet, type ActiveRunSheetIndex } from "../../../components/tracking/active-run/ActiveRunSheet";
import { ActiveRunMapControls } from "../../../components/tracking/active-run/ActiveRunMapControls";
import { ActiveRunStatsCard } from "../../../components/tracking/active-run/ActiveRunStatsCard";
import { ActiveRunActionDock } from "../../../components/tracking/active-run/ActiveRunActionDock";
import { ActiveRunLayersSheet, type ActiveRunLayersSheetIndex } from "../../../components/tracking/active-run/ActiveRunLayersSheet";
import { ActiveRunExpandedView } from "../../../components/tracking/active-run/ActiveRunExpandedView";
import { ActiveRunSportSheet, type SportId } from "../../../components/tracking/active-run/ActiveRunSportSheet";
import { ActiveRunStartSheet } from "../../../components/tracking/active-run/ActiveRunStartSheet";

export default function ActiveRunScreen() {
  const router = useRouter();
  const { colors, isDark } = useAppTheme();
  const insets = useAppSafeAreaInsets();
  const { setIsTabBarVisible } = useTabVisibility();
  const userId = useAppSelector((s) => s.user.profile.id ?? null);
  // Track whether the user has explicitly started a run this session.
  // Prevents useFocusEffect from redirecting before the user presses Start.
  const hasStartedRef = React.useRef(false);
  // Tracks whether background tracking is currently active. Used to debounce so that
  // pause/resume transitions don't repeatedly call startLocationTracking — which would
  // re-prompt the "Location Disclosure" alert on every press (the white flash).
  const trackingActiveRef = React.useRef(false);
  // Surgical subscriptions — only fields whose changes the parent must react to.
  // elapsedSeconds, distanceMeters, coordinates, liveCoordinate are intentionally NOT
  // subscribed here — their displayers (LiveMap, ActiveRunStatsCard, ActiveRunExpandedView)
  // self-subscribe so per-tick updates don't re-render this whole 700-line screen.
  const status = useRunStore((s) => s.status);
  const destination = useRunStore((s) => s.destination);
  // Actions are stable refs — subscribing is free.
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

  // Design Tokens
  const glassBg = isDark ? "rgba(10,10,10,0.65)" : "rgba(255,255,255,0.78)";
  const glassBorder = isDark ? "rgba(255,255,255,0.12)" : "rgba(15,23,42,0.10)";
  const glassShadow = isDark
    ? {
        shadowColor: "#000",
        shadowOpacity: 0.35,
        shadowRadius: 20,
        shadowOffset: { width: 0, height: 10 },
        elevation: 10,
      }
    : {
        shadowColor: "#000",
        shadowOpacity: 0.14,
        shadowRadius: 22,
        shadowOffset: { width: 0, height: 12 },
        elevation: 8,
      };

  useEffect(() => {
    setIsTabBarVisible(false);
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
        return true; // consumed — prevent default back
      }
      return false;
    });
    return () => sub.remove();
  }, [status, resetRun, router]);

  // If this screen gains focus but there's no active run, go back to the
  // tracking home. This prevents the screen from re-appearing when the user
  // leaves the tab and comes back after stopping a run.
  useFocusEffect(
    useCallback(() => {
      // Only redirect if the user already started a run and it's now neither running nor paused.
      // Without this guard, navigating here before pressing Start would immediately redirect back.
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
    // Only start/stop on actual transition into/out of an active run — not on every
    // pause/resume. Avoids re-prompting the OS "Location Disclosure" alert (which
    // looks like a white flash) and avoids the foreground-service notification re-flicker.
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

    // Read latest values imperatively — no need to subscribe up here.
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
    backgroundColor: colors.background,
  }));

  const toastStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: toastTranslateY.value }],
  }));

  const handleManualMove = useCallback(() => {
    setFollowUser(false);
    recordMapInteraction();
  }, [recordMapInteraction]);
  const handleMapPress = useCallback((coord: { latitude: number; longitude: number }) => {
    setDestination(coord);
    setSheetIndex(-1);
  }, [setDestination]);

  if (!hasGps) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 40
        }}
      >
        <View style={{ width: 100, height: 100, borderRadius: 50, backgroundColor: isDark ? "rgba(255,200,100,0.1)" : "rgba(255,200,100,0.15)", alignItems: "center", justifyContent: "center", marginBottom: 24 }}>
           <ActivityIndicator size="large" color={colors.amber} />
        </View>
        <Text
          style={{
            fontFamily: fonts.accentBold,
            fontSize: 22,
            color: colors.textPrimary,
            textAlign: "center",
            marginBottom: 8
          }}
        >
          {gpsError ? "GPS Error" : "Acquiring GPS..."}
        </Text>
        <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.textSecondary, textAlign: "center", lineHeight: 22 }}>
          {gpsError ?? "We need a strong GPS signal to track your run accurately. Please move to an open area."}
        </Text>
        {gpsError && (
          <Pressable
            onPress={() => setupLocationAndPermissions()}
            style={({ pressed }) => ({
              marginTop: 32,
              paddingHorizontal: 24,
              paddingVertical: 14,
              borderRadius: radius.pill,
              backgroundColor: colors.accent,
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              opacity: pressed ? 0.9 : 1,
            })}
          >
            <Ionicons name="refresh" size={18} color="#FFF" />
            <Text
              style={{
                fontFamily: fonts.accentBold,
                fontSize: 15,
                color: "#FFF",
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
      <Stack.Screen
        options={{
          headerShown: false,
          presentation: "fullScreenModal",
          animation: "fade",
          gestureEnabled: status !== "running" && status !== "paused",
        }}
      />
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
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
              backgroundColor: isDark ? "rgba(18,18,18,0.92)" : "rgba(255,255,255,0.94)",
              borderWidth: 1,
              borderColor: isDark ? "rgba(255,255,255,0.10)" : "rgba(15,23,42,0.10)",
              alignItems: "center",
              justifyContent: "center",
              opacity: pressed ? 0.9 : 1,
            })}
          >
            <Ionicons name="chevron-down" size={26} color={colors.textPrimary} />
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
              borderRadius: radius.xl,
              backgroundColor: glassBg,
              borderWidth: 1,
              borderColor: glassBorder,
              ...glassShadow,
              flexDirection: "row",
              gap: 10,
              alignItems: "center"
            }}
          >
            <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(15,23,42,0.05)", alignItems: "center", justifyContent: "center" }}>
               <Ionicons name="time-outline" size={17} color={colors.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: fonts.accentBold, fontSize: 12, color: colors.textPrimary }}>
                GPS STABILIZING…
              </Text>
              <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 10, color: colors.textSecondary }}>
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
                backgroundColor: isDark ? "hsl(220,8%,14%)" : "#F8F6F2",
                borderRadius: 22,
                paddingHorizontal: 18,
                paddingVertical: 16,
                flexDirection: "row",
                alignItems: "flex-start",
                gap: 10,
                borderWidth: isDark ? 1 : 0,
                borderColor: "rgba(255,255,255,0.10)",
              }}
            >
              <Text
                style={{
                  flex: 1,
                  fontFamily: fonts.bodyMedium,
                  fontSize: 16,
                  lineHeight: 22,
                  color: isDark ? "hsl(220,5%,92%)" : "#18181B",
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
                <Ionicons name="close" size={26} color={isDark ? "hsl(220,5%,70%)" : "#18181B"} />
              </Pressable>
            </View>
            <View
              style={{
                width: 22,
                height: 22,
                backgroundColor: isDark ? "hsl(220,8%,14%)" : "#F8F6F2",
                transform: [{ rotate: "45deg" }],
                marginTop: -11,
              }}
            />
          </View>
        ) : null}

        {osrmRoutingEnabled && destination && (isFetchingRoute || routeMetrics) ? (
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              left: 16,
              top: showWarmupBanner ? insets.top + 150 : insets.top + 70,
              paddingHorizontal: 16,
              paddingVertical: 10,
              borderRadius: radius.lg,
              backgroundColor: glassBg,
              borderWidth: 1,
              borderColor: glassBorder,
              opacity: 0.95,
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              ...glassShadow
            }}
          >
            {isFetchingRoute ? (
              <ActivityIndicator size="small" color={colors.accent} />
            ) : (
              <Ionicons name="flash" size={14} color={colors.accent} />
            )}
            <Text style={{ fontFamily: fonts.bodyBold, fontSize: 12, color: colors.textSecondary }}>
              {isFetchingRoute
                ? "CALCULATING ROUTE..."
                : `EST. ${Math.max(1, Math.round(routeMetrics!.durationSec / 60))} MIN · ${(routeMetrics!.distanceM / 1000).toFixed(2)} KM`}
            </Text>
          </View>
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
