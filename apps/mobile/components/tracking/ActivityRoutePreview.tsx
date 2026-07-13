import React, { useEffect, useMemo, useRef } from "react";
import { Animated, Pressable, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import { LocateFixed, MapPin } from "lucide-react-native";

import { Text } from "@/components/ScaledText";
import type { CurrentLocationPreviewState } from "@/hooks/tracking/useCurrentLocationPreview";

export type ActivityRouteCoordinate = { latitude: number; longitude: number };

export type ActivityRoutePreviewColors = {
  background: string;
  foreground: string;
  muted: string;
  accent: string;
  border: string;
};

type Props = {
  coordinates: ActivityRouteCoordinate[];
  locationState: CurrentLocationPreviewState;
  colors: ActivityRoutePreviewColors;
  reducedMotion: boolean;
  onOpenActivity: () => void;
  onRequestPermission: () => void;
  onRetry: () => void;
  onOpenSettings: () => void;
};

function routePath(coordinates: ActivityRouteCoordinate[]): string {
  if (coordinates.length < 2) return "";
  const thin = coordinates.length > 80
    ? coordinates.filter((_, index) => index % Math.ceil(coordinates.length / 80) === 0)
    : coordinates;
  const sortedLats = thin.map((point) => point.latitude).sort((a, b) => a - b);
  const sortedLngs = thin.map((point) => point.longitude).sort((a, b) => a - b);
  const medianLat = sortedLats[Math.floor(sortedLats.length / 2)]!;
  const medianLng = sortedLngs[Math.floor(sortedLngs.length / 2)]!;
  const clean = thin.filter(
    (point) => Math.abs(point.latitude - medianLat) < 0.05 && Math.abs(point.longitude - medianLng) < 0.05,
  );
  if (clean.length < 2) return "";
  const lats = clean.map((point) => point.latitude);
  const lngs = clean.map((point) => point.longitude);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const latRange = maxLat - minLat || 0.0001;
  const lngRange = maxLng - minLng || 0.0001;
  return clean.map((point, index) => {
    const x = 24 + ((point.longitude - minLng) / lngRange) * 252;
    const y = 24 + ((maxLat - point.latitude) / latRange) * 142;
    return `${index === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(" ");
}

function StatusButton({ label, onPress, colors }: { label: string; onPress: () => void; colors: ActivityRoutePreviewColors }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => ({
        alignSelf: "flex-start",
        backgroundColor: colors.foreground,
        borderRadius: 999,
        opacity: pressed ? 0.72 : 1,
        paddingHorizontal: 12,
        paddingVertical: 7,
      })}
    >
      <Text style={{ color: colors.background, fontFamily: "Outfit-Bold", fontSize: 11 }}>{label}</Text>
    </Pressable>
  );
}

export function ActivityRoutePreview({
  coordinates,
  locationState,
  colors,
  reducedMotion,
  onOpenActivity,
  onRequestPermission,
  onRetry,
  onOpenSettings,
}: Props) {
  const path = useMemo(() => routePath(coordinates), [coordinates]);
  const hasRecordedCoordinates = coordinates.length > 0;
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (hasRecordedCoordinates || locationState.status !== "ready" || reducedMotion) {
      pulse.stopAnimation();
      pulse.setValue(0);
      return;
    }
    const animation = Animated.loop(
      Animated.timing(pulse, { duration: 1800, toValue: 1, useNativeDriver: true }),
    );
    animation.start();
    return () => animation.stop();
  }, [hasRecordedCoordinates, locationState.status, pulse, reducedMotion]);

  const accessibilityLabel = hasRecordedCoordinates
    ? "Recorded route preview"
    : locationState.status === "ready"
      ? `Current location in ${locationState.areaLabel}`
      : locationState.status === "permission-required"
        ? "Location permission required"
        : locationState.status === "denied"
          ? "Location access denied"
          : locationState.status === "checking"
            ? "Finding your current area"
            : "Current location unavailable";
  const sceneIsSingleAccessibilityElement = !hasRecordedCoordinates
    && (locationState.status === "ready" || locationState.status === "checking");

  const scene = (
    <View
      accessible={sceneIsSingleAccessibilityElement}
      accessibilityLabel={sceneIsSingleAccessibilityElement ? accessibilityLabel : undefined}
      style={{ height: 190, backgroundColor: colors.background, overflow: "hidden" }}
    >
      <Svg width="100%" height="100%" viewBox="0 0 300 190">
        {hasRecordedCoordinates ? (
          <>
            {path ? (
              <>
                <Path d={path} stroke={colors.border} strokeWidth={10} strokeLinecap="round" strokeLinejoin="round" fill="none" />
                <Path d={path} stroke={colors.accent} strokeWidth={5.5} strokeLinecap="round" strokeLinejoin="round" fill="none" />
              </>
            ) : (
              <Circle cx="150" cy="78" r="7" fill={colors.accent} />
            )}
          </>
        ) : (
          <>
            <Path d="M0 38H300M0 76H300M0 114H300M0 152H300M60 0V190M120 0V190M180 0V190M240 0V190" stroke={colors.border} strokeWidth={0.7} opacity={0.55} />
            <Path d="M-15 148C35 104 70 166 118 124S205 70 320 100M-20 63C38 14 82 83 136 48S235 12 315 31" stroke={colors.muted} strokeWidth={1.2} opacity={0.18} fill="none" />
            <Circle cx="150" cy="78" r="34" fill={colors.accent} opacity={0.06} />
          </>
        )}
      </Svg>

      {!hasRecordedCoordinates && locationState.status === "ready" ? (
        <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, top: 42, alignItems: "center" }}>
          <Animated.View
            style={{
              position: "absolute",
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: colors.accent,
              opacity: reducedMotion ? 0.12 : pulse.interpolate({ inputRange: [0, 1], outputRange: [0.2, 0] }),
              transform: [{ scale: reducedMotion ? 1 : pulse.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1.8] }) }],
            }}
          />
          <View style={{ width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: colors.accent }}>
            <LocateFixed size={15} color="#fff" />
          </View>
        </View>
      ) : null}

      <View style={{ position: "absolute", bottom: 12, left: 12, right: 12, gap: 4 }}>
        {hasRecordedCoordinates ? (
          <View style={{ alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(0,0,0,0.58)", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 }}>
            <MapPin size={12} color="#fff" />
            <Text style={{ color: "#fff", fontFamily: "Outfit-Bold", fontSize: 11 }}>Route Preview</Text>
          </View>
        ) : locationState.status === "ready" ? (
          <View style={{ gap: 1 }}>
            <Text style={{ color: colors.foreground, fontFamily: "Outfit-Bold", fontSize: 13 }}>Current location</Text>
            <Text style={{ color: colors.muted, fontFamily: "Outfit-Regular", fontSize: 12 }}>{locationState.areaLabel}</Text>
          </View>
        ) : locationState.status === "permission-required" ? (
          <View style={{ gap: 7 }}>
            <Text style={{ color: colors.muted, fontFamily: "Outfit-Regular", fontSize: 12 }}>See your current area here</Text>
            <StatusButton label="Use my location" onPress={onRequestPermission} colors={colors} />
          </View>
        ) : locationState.status === "denied" ? (
          <View style={{ gap: 7 }}>
            <Text style={{ color: colors.foreground, fontFamily: "Outfit-Bold", fontSize: 12 }}>Location access is off</Text>
            {locationState.canOpenSettings
              ? <StatusButton label="Open Settings" onPress={onOpenSettings} colors={colors} />
              : <StatusButton label="Use my location" onPress={onRequestPermission} colors={colors} />}
          </View>
        ) : locationState.status === "checking" ? (
          <Text style={{ color: colors.muted, fontFamily: "Outfit-Bold", fontSize: 12 }}>Finding your area</Text>
        ) : (
          <View style={{ gap: 7 }}>
            <Text accessibilityLabel="Current location unavailable" style={{ color: colors.foreground, fontFamily: "Outfit-Bold", fontSize: 12 }}>Location unavailable</Text>
            <StatusButton label="Try again" onPress={onRetry} colors={colors} />
          </View>
        )}
      </View>
    </View>
  );

  if (!hasRecordedCoordinates) return scene;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="Open recorded route" onPress={onOpenActivity}>
      {scene}
    </Pressable>
  );
}
