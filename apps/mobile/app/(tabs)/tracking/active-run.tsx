import React, { useEffect, useState, useCallback } from "react";
import { Platform, Text, View, Pressable } from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useRouter } from "expo-router";
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
} from "../../../lib/backgroundTask";

import { useRunTrackingEngine } from "../../../hooks/tracking/useRunTrackingEngine";
import { LiveMap } from "../../../components/tracking/active-run/LiveMap";
import { RunStatusOverlay } from "../../../components/tracking/active-run/RunStatusOverlay";
import { RunActionButtons } from "../../../components/tracking/active-run/RunActionButtons";
import { RunBottomBar } from "../../../components/tracking/active-run/RunBottomBar";
import { RunStopSheet } from "../../../components/tracking/active-run/RunStopSheet";
import { RunToast } from "../../../components/tracking/active-run/RunToast";

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
  } = useRunTrackingEngine(toastTranslateY, insets.top);

  const useOsmMap = false; // User explicitly requested realistic map (native MapView)
  const bottomBarHeight = 88;
  const overlayGap = 16;

  // Glass Morphism Styles
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
      startLocationTracking().catch(() => null);
    } else {
      stopForegroundWatch();
      stopLocationTracking().catch(() => null);
    }
  }, [hasGps, startForegroundWatch, status, stopForegroundWatch]);

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
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <Animated.View style={screenStyle}>
        <LiveMap
          useOsmMap={useOsmMap}
          activeRegion={activeRegion}
          coordinates={coordinates}
          lastCoordinate={lastCoordinate}
          destination={destination}
          isDark={isDark}
          colors={colors}
          followUser={followUser}
          onManualMove={() => setFollowUser(false)}
          onRecenter={() => {
            setFollowUser(true);
            if (activeRegion) {
              // Recenter logic already inside LiveMap's useEffect for followUser
            }
          }}
        />

        {coordinates.length < 2 && (
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
            <Text
              style={{
                fontFamily: fonts.bodyMedium,
                color: colors.textPrimary,
              }}
            >
              Waiting for GPS lock…
            </Text>
            <Text
              style={{
                fontFamily: fonts.bodyRegular,
                color: colors.textSecondary,
                marginTop: 2,
              }}
            >
              Start moving to see your route.
            </Text>
          </View>
        )}

        <RunStatusOverlay
          status={status}
          goalKm={goalKm}
          destination={destination}
          colors={colors}
          glassBg={glassBg}
          glassBorder={glassBorder}
          glassShadow={glassShadow}
          insetsTop={insets.top}
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
          insetsBottom={insets.bottom}
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
          insetsBottom={insets.bottom}
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
        />
      </Animated.View>
    </SafeAreaView>
  );
}
