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
import { useRunStore } from "../../../store/useRunStore";
import {
  stopLocationTracking,
  startLocationTracking,
  refreshRunNotification,
} from "../../../lib/backgroundTask";

import { useRunTrackingEngine } from "../../../hooks/tracking/useRunTrackingEngine";
import { LiveMap } from "../../../components/tracking/active-run/LiveMap";
import { RunToast } from "../../../components/tracking/active-run/RunToast";
import { mainTabBarTotalHeight } from "../../../lib/tracking/mainTabBarInset";
import {
  getRunBackgroundTrackingDefault,
  getOsrmRoutingDefault,
} from "../../../lib/runTrackingPreferences";
import type { TrackingMapStyle } from "../../../components/tracking/trackingMapLayers";
import { ActiveRunSheet, type ActiveRunSheetIndex } from "../../../components/tracking/active-run/ActiveRunSheet";
import { ActiveRunMapControls } from "../../../components/tracking/active-run/ActiveRunMapControls";

export default function ActiveRunScreen() {
  const router = useRouter();
  const { colors, isDark } = useAppTheme();
  const insets = useAppSafeAreaInsets();
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
  const [sheetIndex, setSheetIndex] = useState<ActiveRunSheetIndex>(0);
  const [pickingDestination, setPickingDestination] = useState(false);
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

  const mainTabBarOverlap = mainTabBarTotalHeight(insets.bottom);
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

  const controlsBottom =
    mainTabBarOverlap +
    (sheetIndex === 0 ? 320 : 520);

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
          onPress={
            pickingDestination
              ? (coord) => {
                  setDestination(coord);
                  setPickingDestination(false);
                  setFollowUser(true);
                  setSheetIndex(0);
                }
              : undefined
          }
        />

        {/* Top-left exit */}
        <View style={{ position: "absolute", left: 14, top: insets.top + 6, zIndex: 40 }}>
          <Pressable
            onPress={() => {
              if (status === "running" || status === "paused") {
                setSheetIndex(1);
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
          onOpenLayers={() => setSheetIndex(1)}
          onToggle3D={() => {
            Alert.alert("Coming soon", "3D map camera will be added later.");
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
              paddingHorizontal: 16,
              paddingVertical: 12,
              borderRadius: radius.xl,
              backgroundColor: glassBg,
              borderWidth: 1,
              borderColor: glassBorder,
              ...glassShadow,
              flexDirection: "row",
              gap: 12,
              alignItems: "center"
            }}
          >
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(15,23,42,0.05)", alignItems: "center", justifyContent: "center" }}>
               <Ionicons name="time-outline" size={20} color={colors.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: fonts.accentBold, fontSize: 14, color: colors.textPrimary }}>
                GPS STABILIZING ({warmupSecondsLeft}s)
              </Text>
              <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 11, color: colors.textSecondary }}>
                Stand still for best accuracy
              </Text>
            </View>
          </View>
        )}

        {pickingDestination ? (
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              left: 16,
              right: 16,
              top: insets.top + 134,
              paddingHorizontal: 16,
              paddingVertical: 12,
              borderRadius: radius.xl,
              backgroundColor: glassBg,
              borderWidth: 1,
              borderColor: glassBorder,
              ...glassShadow,
              zIndex: 35,
            }}
          >
            <Text style={{ fontFamily: fonts.accentBold, fontSize: 13, color: colors.textPrimary }}>
              Tap the map to set your route destination
            </Text>
            <Text style={{ marginTop: 2, fontFamily: fonts.bodyMedium, fontSize: 11, color: colors.textSecondary }}>
              This is optional — you can finish without a destination.
            </Text>
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

        <ActiveRunSheet
          index={sheetIndex}
          setIndex={setSheetIndex}
          status={status}
          elapsedSeconds={elapsedSeconds}
          distanceMeters={distanceMeters}
          mapStyle={mapStyle}
          onChangeMapStyle={setMapStyle}
          colors={colors}
          isDark={isDark}
          mainTabBarOverlap={mainTabBarOverlap}
          onPrimaryPress={handlePrimaryPress}
          onAddRoute={() => {
            setPickingDestination(true);
            setSheetIndex(0);
          }}
          onShareLiveLocation={() => {
            setSheetIndex(0);
            router.push("/(tabs)/tracking/social" as any);
          }}
          onFinishRun={handleFinishRun}
          onIndexChange={(i) => setSheetIndex(i)}
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
