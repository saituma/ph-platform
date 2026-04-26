import React, { useEffect, useState } from "react";
import { Text, View, Pressable, ActivityIndicator, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { useRouter, Stack } from "expo-router";
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
} from "../../../lib/runTrackingPreferences";
import type { TrackingMapStyle } from "../../../components/tracking/trackingMapLayers";
import { ActiveRunSheet, type ActiveRunSheetIndex } from "../../../components/tracking/active-run/ActiveRunSheet";
import { ActiveRunMapControls } from "../../../components/tracking/active-run/ActiveRunMapControls";
import { ActiveRunStatsCard } from "../../../components/tracking/active-run/ActiveRunStatsCard";
import { ActiveRunActionDock } from "../../../components/tracking/active-run/ActiveRunActionDock";
import { ActiveRunLayersSheet, type ActiveRunLayersSheetIndex } from "../../../components/tracking/active-run/ActiveRunLayersSheet";

export default function ActiveRunScreen() {
  const router = useRouter();
  const { colors, isDark } = useAppTheme();
  const insets = useAppSafeAreaInsets();
  const { setIsTabBarVisible } = useTabVisibility();
  const {
    status,
    startRun,
    pauseRun,
    resumeRun,
    stopRun,
    elapsedSeconds,
    distanceMeters,
    coordinates,
    destination,
    setDestination,
  } = useRunStore();

  const [backgroundTrackingEnabled, setBackgroundTrackingEnabled] =
    useState(false);
  const [osrmRoutingEnabled, setOsrmRoutingEnabled] = useState(false);
  const [mapStyle, setMapStyle] = useState<TrackingMapStyle>("road");
  const [sheetIndex, setSheetIndex] = useState<ActiveRunSheetIndex>(-1);
  const [layersSheetIndex, setLayersSheetIndex] = useState<ActiveRunLayersSheetIndex>(-1);
  const [pointsOfInterestEnabled, setPointsOfInterestEnabled] = useState(true);
  const [showRunSheetHint, setShowRunSheetHint] = useState(true);
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(24);
  const toastTranslateY = useSharedValue(-120);

  const {
    hasGps,
    gpsError,
    followUser,
    setFollowUser,
    activeRegion,
    toastMessage,
    startForegroundWatch,
    stopForegroundWatch,
    setupLocationAndPermissions,
    lastCoordinate,
    routePolyline,
    routeMetrics,
    isFetchingRoute,
    isWarmedUp,
  } = useRunTrackingEngine(toastTranslateY, insets.top, { osrmRoutingEnabled });

  const bottomSafeInset = Math.max(insets.bottom, 12);
  const showWarmupBanner = !isWarmedUp && status === "running";
  const warmupSecondsLeft = Math.max(0, 8 - elapsedSeconds);

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

  useEffect(() => {
    let active = true;
    (async () => {
      const [bg, osrm] = await Promise.all([
        getRunBackgroundTrackingDefault(),
        getOsrmRoutingDefault(),
      ]);
      if (!active) return;
      setBackgroundTrackingEnabled(bg);
      setOsrmRoutingEnabled(osrm);
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
    if (!hasGps) return;
    if (status === "running") {
      startForegroundWatch().catch(() => null);
      if (backgroundTrackingEnabled) {
        startLocationTracking().catch(() => null);
      } else {
        stopLocationTracking().catch(() => null);
      }
    } else {
      stopForegroundWatch();
      stopLocationTracking().catch(() => null);
    }
  }, [
    backgroundTrackingEnabled,
    hasGps,
    startForegroundWatch,
    status,
    stopForegroundWatch,
  ]);

  const handleFinishRun = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    stopRun();
    router.replace("/(tabs)/tracking/summary" as any);
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
      startRun();
      return;
    }
  };

  const isSheetOpen = sheetIndex >= 0 || layersSheetIndex >= 0;
  const showRunDock = sheetIndex === -1 && layersSheetIndex === -1;
  const statsBottom = bottomSafeInset + 196;
  const controlsBottom =
    layersSheetIndex >= 0
      ? bottomSafeInset + 336
      : sheetIndex >= 0
        ? bottomSafeInset + 336
        : bottomSafeInset + 392;

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
          presentation: "fullScreenModal",
          animation: "fade",
        }}
      />
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <Animated.View style={screenStyle}>
        <LiveMap
          activeRegion={activeRegion}
          coordinates={coordinates}
          lastCoordinate={lastCoordinate}
          destination={destination}
          isDark={isDark}
          colors={colors}
          followUser={followUser}
          routePolyline={routePolyline}
          onManualMove={() => setFollowUser(false)}
          mapStyle={mapStyle}
          onPress={(coord) => {
            setDestination(coord);
            setSheetIndex(-1);
          }}
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
                GPS STABILIZING ({warmupSecondsLeft}s)
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
                backgroundColor: "#F8F6F2",
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
                  fontFamily: fonts.bodyMedium,
                  fontSize: 16,
                  lineHeight: 22,
                  color: "#18181B",
                }}
              >
                Share location, change sports, and edit settings right here.
              </Text>
              <Pressable
                onPress={() => setShowRunSheetHint(false)}
                style={{ padding: 2 }}
              >
                <Ionicons name="close" size={26} color="#18181B" />
              </Pressable>
            </View>
            <View
              style={{
                width: 22,
                height: 22,
                backgroundColor: "#F8F6F2",
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

        {!isSheetOpen ? (
          <>
            <View
              style={{
                position: "absolute",
                left: 18,
                right: 18,
                bottom: statsBottom,
                zIndex: 25,
              }}
            >
              <ActiveRunStatsCard
                elapsedSeconds={elapsedSeconds}
                distanceMeters={distanceMeters}
                colors={colors}
                isDark={isDark}
              />
            </View>
          </>
        ) : null}

        {showRunDock ? (
          <View
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 30,
              backgroundColor: isDark ? "rgba(18,18,18,0.96)" : "rgba(255,255,255,0.98)",
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              borderWidth: 1,
              borderColor: isDark ? "rgba(255,255,255,0.10)" : "rgba(15,23,42,0.10)",
              paddingTop: 12,
              paddingHorizontal: 20,
              paddingBottom: bottomSafeInset,
            }}
          >
            <ActiveRunActionDock
              status={status}
              colors={colors}
              isDark={isDark}
              onPrimaryPress={handlePrimaryPress}
              onOpenSheet={() => setSheetIndex(0)}
              onFinishRun={handleFinishRun}
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
    </>
  );
}
