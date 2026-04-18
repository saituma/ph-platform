import React, { useEffect, useState } from "react";
import { SafeAreaView, Text, View, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, Stack } from "expo-router";
import * as Haptics from "expo-haptics";
import Animated, {
  useAnimatedStyle,
  withSpring,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { fonts, radius, icons as themeIcons } from "@/constants/theme";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { useRunStore } from "../../../store/useRunStore";
import {
  stopLocationTracking,
  startLocationTracking,
  refreshRunNotification,
} from "../../../lib/backgroundTask";

import { useRunTrackingEngine } from "../../../hooks/tracking/useRunTrackingEngine";
import { LiveMap } from "../../../components/tracking/active-run/LiveMap";
import { RunPrivacyControls } from "../../../components/tracking/active-run/RunPrivacyControls";
import { RunStatusOverlay } from "../../../components/tracking/active-run/RunStatusOverlay";
import { RunActionButtons } from "../../../components/tracking/active-run/RunActionButtons";
import { RunBottomBar } from "../../../components/tracking/active-run/RunBottomBar";
import { RunStopSheet } from "../../../components/tracking/active-run/RunStopSheet";
import { RunToast } from "../../../components/tracking/active-run/RunToast";
import { mainTabBarTotalHeight } from "../../../lib/tracking/mainTabBarInset";
import {
  getRunBackgroundTrackingDefault,
  setRunBackgroundTrackingDefault,
  getOsrmRoutingDefault,
  setOsrmRoutingDefault,
} from "../../../lib/runTrackingPreferences";
import { ensureOsrmConsentOrExplain } from "../../../lib/osrmRoutingConsent";

export default function ActiveRunScreen() {
  const router = useRouter();
  const { colors, isDark } = useAppTheme();
  const insets = useSafeAreaInsets();
  const {
    status,
    pauseRun,
    resumeRun,
    stopRun,
    elapsedSeconds,
    distanceMeters,
    coordinates,
    goalKm,
    destination,
  } = useRunStore();

  const [backgroundTrackingEnabled, setBackgroundTrackingEnabled] =
    useState(false);
  const [osrmRoutingEnabled, setOsrmRoutingEnabled] = useState(false);
  const [showStopSheet, setShowStopSheet] = useState(false);
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(24);
  const sheetTranslateY = useSharedValue(800);
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

  const bottomBarHeight = 88;
  const overlayGap = 16;
  const actionRowHeight = 56;
  /** Root tab bar (`SwipeableTabLayout`) overlays this screen — lift controls above it. */
  const mainTabBarOverlap = mainTabBarTotalHeight(insets.bottom);
  /** Map / Satellite control sits just above the pause–stop row (aligned with pause, left: 16). */
  const mapStyleAnchorBottom =
    mainTabBarOverlap + bottomBarHeight + overlayGap + 8 + actionRowHeight + 10;
  const showWarmupBanner = !isWarmedUp && status === "running";
  const warmupSecondsLeft = Math.max(0, 8 - elapsedSeconds);

  const glassBg = isDark ? "rgba(20,20,20,0.55)" : "rgba(255,255,255,0.72)";
  const glassBorder = isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.08)";
  const glassShadow = isDark
    ? {
        shadowColor: "#000",
        shadowOpacity: 0.3,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 8 },
        elevation: 8,
      }
    : {
        shadowColor: "#000",
        shadowOpacity: 0.12,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 10 },
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
    opacity.value = withTiming(1, { duration: 350 });
    translateY.value = withSpring(0, { damping: 18, stiffness: 200 });

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

  const openStopDialog = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    pauseRun();
    setShowStopSheet(true);
    sheetTranslateY.value = withSpring(0, { damping: 20, stiffness: 200 });
  };

  const closeStopDialogAndResume = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    sheetTranslateY.value = withSpring(800, { damping: 20, stiffness: 200 });
    setTimeout(() => {
      setShowStopSheet(false);
      resumeRun();
    }, 300);
  };

  const handleFinishRun = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    stopRun();
    setShowStopSheet(false);
    router.replace("/(tabs)/tracking/summary" as any);
  };

  const screenStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
    flex: 1,
    backgroundColor: colors.bg,
  }));

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: sheetTranslateY.value }],
  }));

  const toastStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: toastTranslateY.value }],
  }));

  if (!hasGps) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.bg,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons
          name={themeIcons.gpsSearching.name as any}
          size={48}
          color={colors.warning}
          style={{ marginBottom: 16 }}
        />
        <Text
          style={{
            fontFamily: fonts.heading2,
            fontSize: 20,
            color: colors.textSecondary,
          }}
        >
          {gpsError ?? "Acquiring GPS..."}
        </Text>
        {gpsError && (
          <Pressable
            onPress={() => setupLocationAndPermissions()}
            style={{
              marginTop: 16,
              paddingHorizontal: 16,
              paddingVertical: 10,
              borderRadius: radius.pill,
              backgroundColor: colors.surfaceHigh,
              borderWidth: 1,
              borderColor: colors.borderSubtle,
            }}
          >
            <Text
              style={{
                fontFamily: fonts.bodyMedium,
                color: colors.textPrimary,
              }}
            >
              Try again
            </Text>
          </Pressable>
        )}
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
          presentation: "fullScreenModal",
          animation: "fade",
        }}
      />
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
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
          onRecenter={() => {
            setFollowUser(true);
          }}
          mapStyleAnchorBottom={mapStyleAnchorBottom}
        />

        {showWarmupBanner && (
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              left: 12,
              top: 12,
              right: 72,
              paddingHorizontal: 12,
              paddingVertical: 10,
              borderRadius: 16,
              backgroundColor: colors.surfaceHigh,
              borderWidth: 1,
              borderColor: colors.borderSubtle,
            }}
          >
            <Text style={{ fontFamily: fonts.bodyMedium, color: colors.textPrimary }}>
              GPS stabilizing… ({warmupSecondsLeft}s)
            </Text>
            <Text style={{ fontFamily: fonts.bodyRegular, color: colors.textSecondary, marginTop: 2 }}>
              Warmup period, please stand still or stretch.
            </Text>
          </View>
        )}

        {osrmRoutingEnabled && destination && (isFetchingRoute || routeMetrics) ? (
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              left: 12,
              top: showWarmupBanner ? 80 : 12,
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 12,
              backgroundColor: colors.surfaceHigh,
              borderWidth: 1,
              borderColor: colors.borderSubtle,
              opacity: 0.92,
            }}
          >
            <Text style={{ fontFamily: fonts.bodyRegular, fontSize: 13, color: colors.textSecondary }}>
              {isFetchingRoute
                ? "Calculating route…"
                : routeMetrics
                  ? `Driving route ~${Math.max(1, Math.round(routeMetrics.durationSec / 60))} min · ${(routeMetrics.distanceM / 1000).toFixed(2)} km`
                  : ""}
            </Text>
          </View>
        ) : null}

        <RunStatusOverlay
          status={status}
          goalKm={goalKm}
          destination={destination}
          lastCoordinate={lastCoordinate}
          distanceMeters={distanceMeters}
          colors={colors}
          glassBg={glassBg}
          glassBorder={glassBorder}
          glassShadow={glassShadow}
          insetsTop={insets.top}
        />

        <RunPrivacyControls
          colors={colors}
          glassBg={glassBg}
          glassBorder={glassBorder}
          glassShadow={glassShadow}
          mainTabBarOverlap={mainTabBarOverlap}
          bottomOffsetFromTabBar={
            bottomBarHeight + overlayGap + 8 + actionRowHeight + 12
          }
          backgroundTrackingEnabled={backgroundTrackingEnabled}
          onToggleBackgroundTracking={() => {
            const next = !backgroundTrackingEnabled;
            setBackgroundTrackingEnabled(next);
            void setRunBackgroundTrackingDefault(next);
            // When enabling, the next effect tick will call startLocationTracking() which shows disclosure+permission if needed.
          }}
          osrmRoutingEnabled={osrmRoutingEnabled}
          onToggleOsrmRouting={async () => {
            if (osrmRoutingEnabled) {
              setOsrmRoutingEnabled(false);
              void setOsrmRoutingDefault(false);
              return;
            }
            const ok = await ensureOsrmConsentOrExplain();
            if (!ok) return;
            setOsrmRoutingEnabled(true);
            void setOsrmRoutingDefault(true);
          }}
        />

        <RunActionButtons
          status={status}
          onPause={pauseRun}
          onResume={resumeRun}
          onStop={openStopDialog}
          colors={colors}
          glassBg={glassBg}
          glassBorder={glassBorder}
          glassShadow={glassShadow}
          mainTabBarOverlap={mainTabBarOverlap}
          bottomBarHeight={bottomBarHeight}
          overlayGap={overlayGap}
        />

        <RunBottomBar
          elapsedSeconds={elapsedSeconds}
          distanceMeters={distanceMeters}
          colors={colors}
          glassBg={glassBg}
          glassBorder={glassBorder}
          glassShadow={glassShadow}
          mainTabBarOverlap={mainTabBarOverlap}
          bottomBarHeight={bottomBarHeight}
        />

        <RunToast
          message={toastMessage}
          toastStyle={toastStyle}
          colors={colors}
        />

        <RunStopSheet
          isVisible={showStopSheet}
          sheetStyle={sheetStyle}
          distanceMeters={distanceMeters}
          elapsedSeconds={elapsedSeconds}
          onFinish={handleFinishRun}
          onResume={closeStopDialogAndResume}
          colors={colors}
          insetsBottom={insets.bottom}
          mainTabBarOverlap={mainTabBarOverlap}
        />
        </Animated.View>
      </SafeAreaView>
    </>
  );
}
