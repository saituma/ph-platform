import React, { useMemo, useState } from "react";
import { Alert, Pressable, View } from "react-native";
import BottomSheet, { BottomSheetBackdrop, BottomSheetView } from "@gorhom/bottom-sheet";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { Text } from "@/components/ScaledText";
import { fonts, radius } from "@/constants/theme";
import { ActiveRunActionDock } from "./ActiveRunActionDock";
import { ActiveRunStatsCard } from "./ActiveRunStatsCard";

export type ActiveRunSheetIndex = 0 | 1;

export function ActiveRunSheet({
  index,
  setIndex,
  status,
  elapsedSeconds,
  distanceMeters,
  mapStyle,
  onChangeMapStyle,
  colors,
  isDark,
  mainTabBarOverlap,
  onPrimaryPress,
  onAddRoute,
  onShareLiveLocation,
  onFinishRun,
  onIndexChange,
}: {
  index: ActiveRunSheetIndex;
  setIndex: (index: ActiveRunSheetIndex) => void;
  status: "idle" | "running" | "paused" | "stopped";
  elapsedSeconds: number;
  distanceMeters: number;
  mapStyle: "road" | "satellite";
  onChangeMapStyle: (next: "road" | "satellite") => void;
  colors: Record<string, string>;
  isDark: boolean;
  mainTabBarOverlap: number;
  onPrimaryPress: () => void;
  onAddRoute: () => void;
  onShareLiveLocation: () => void;
  onFinishRun: () => void;
  onIndexChange?: (index: ActiveRunSheetIndex) => void;
}) {
  const snapPoints = useMemo(() => [300, "62%"] as const, []);
  const [trackLaps, setTrackLaps] = useState(false);

  const cardBg = isDark ? "rgba(18,18,18,0.94)" : "rgba(255,255,255,0.96)";
  const cardBorder = isDark ? "rgba(255,255,255,0.10)" : "rgba(15,23,42,0.10)";

  return (
    <BottomSheet
      index={index}
      snapPoints={snapPoints as any}
      onChange={(next) => {
        const idx = (next === 1 ? 1 : 0) as ActiveRunSheetIndex;
        setIndex(idx);
        onIndexChange?.(idx);
      }}
      enablePanDownToClose={false}
      bottomInset={mainTabBarOverlap}
      backdropComponent={(props) => (
        <BottomSheetBackdrop
          {...props}
          appearsOnIndex={1}
          disappearsOnIndex={0}
          opacity={0.45}
          pressBehavior="collapse"
        />
      )}
      backgroundStyle={{ backgroundColor: "transparent" }}
      handleIndicatorStyle={{
        backgroundColor: isDark ? "rgba(255,255,255,0.30)" : "rgba(15,23,42,0.22)",
        width: 44,
      }}
    >
      <BottomSheetView
        style={{
          paddingHorizontal: 16,
          paddingBottom: 18 + mainTabBarOverlap,
        }}
      >
        <View
          style={{
            backgroundColor: cardBg,
            borderRadius: 28,
            borderWidth: 1,
            borderColor: cardBorder,
            padding: 16,
          }}
        >
          {index === 0 ? (
            <View style={{ marginBottom: 16 }}>
              <ActiveRunStatsCard
                elapsedSeconds={elapsedSeconds}
                distanceMeters={distanceMeters}
                colors={colors}
                isDark={isDark}
              />
            </View>
          ) : null}

          <ActiveRunActionDock
            status={status}
            colors={colors}
            isDark={isDark}
            onPrimaryPress={onPrimaryPress}
            onOpenSheet={() => setIndex(1)}
            onAddRoute={() => {
              setIndex(0);
              onAddRoute();
            }}
          />

          {index === 1 ? (
            <View style={{ marginTop: 18, gap: 10 }}>
              <View
                style={{
                  flexDirection: "row",
                  gap: 10,
                  marginBottom: 6,
                }}
              >
                <MapStylePill
                  label="Standard"
                  active={mapStyle === "road"}
                  onPress={() => onChangeMapStyle("road")}
                  colors={colors}
                  isDark={isDark}
                />
                <MapStylePill
                  label="Satellite"
                  active={mapStyle === "satellite"}
                  onPress={() => onChangeMapStyle("satellite")}
                  colors={colors}
                  isDark={isDark}
                />
              </View>
              <SheetRow
                icon="share-social-outline"
                title="Share live location"
                subtitle="Team mode"
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onShareLiveLocation();
                }}
                colors={colors}
              />
              <SheetToggleRow
                icon="repeat-outline"
                title="Track laps"
                subtitle="Manually track lap times"
                value={trackLaps}
                onToggle={() => setTrackLaps((v) => !v)}
                colors={colors}
                isDark={isDark}
              />
              <SheetRow
                icon="pulse-outline"
                title="Add a sensor"
                subtitle="Connect heart-rate or footpod"
                onPress={() => {
                  Alert.alert("Coming soon", "Sensor integrations will be added later.");
                }}
                colors={colors}
              />
              <SheetRow
                icon="settings-outline"
                title="Settings"
                subtitle="Audio cues, auto-pause, route options"
                onPress={() => {
                  Alert.alert("Coming soon", "More run settings will be added later.");
                }}
                colors={colors}
              />

              <View style={{ height: 1, backgroundColor: colors.borderSubtle, opacity: 0.8, marginVertical: 6 }} />

              <Pressable
                onPress={() => {
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                  Alert.alert(
                    "Finish run?",
                    "This will stop tracking and take you to the summary.",
                    [
                      { text: "Cancel", style: "cancel" },
                      { text: "Finish", style: "destructive", onPress: onFinishRun },
                    ],
                  );
                }}
                style={({ pressed }) => ({
                  height: 54,
                  borderRadius: radius.xl,
                  backgroundColor: "rgba(239,68,68,0.14)",
                  borderWidth: 1,
                  borderColor: "rgba(239,68,68,0.30)",
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: pressed ? 0.9 : 1,
                })}
              >
                <Text style={{ fontFamily: fonts.heading2, fontSize: 16, color: "#EF4444" }}>
                  Finish run
                </Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      </BottomSheetView>
    </BottomSheet>
  );
}

function MapStylePill({
  label,
  active,
  onPress,
  colors,
  isDark,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  colors: Record<string, string>;
  isDark: boolean;
}) {
  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      style={({ pressed }) => ({
        flex: 1,
        height: 44,
        borderRadius: radius.pill,
        borderWidth: 1,
        borderColor: active
          ? colors.accent
          : isDark
            ? "rgba(255,255,255,0.10)"
            : "rgba(15,23,42,0.10)",
        backgroundColor: active
          ? `${colors.accent}22`
          : isDark
            ? "rgba(255,255,255,0.06)"
            : "rgba(15,23,42,0.04)",
        alignItems: "center",
        justifyContent: "center",
        opacity: pressed ? 0.9 : 1,
      })}
    >
      <Text style={{ fontFamily: fonts.heading3, fontSize: 14, color: active ? colors.accent : colors.textPrimary }}>
        {label}
      </Text>
    </Pressable>
  );
}

function SheetRow({
  icon,
  title,
  subtitle,
  onPress,
  colors,
}: {
  icon: string;
  title: string;
  subtitle: string;
  onPress: () => void;
  colors: Record<string, string>;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 14,
        paddingHorizontal: 14,
        borderRadius: radius.xl,
        backgroundColor: pressed ? "rgba(255,255,255,0.06)" : "transparent",
      })}
    >
      <Ionicons name={icon as any} size={24} color={colors.textPrimary} />
      <View style={{ marginLeft: 14, flex: 1 }}>
        <Text style={{ fontFamily: fonts.heading3, fontSize: 16, color: colors.textPrimary }}>
          {title}
        </Text>
        <Text style={{ marginTop: 2, fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.textSecondary }}>
          {subtitle}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
    </Pressable>
  );
}

function SheetToggleRow({
  icon,
  title,
  subtitle,
  value,
  onToggle,
  colors,
  isDark,
}: {
  icon: string;
  title: string;
  subtitle: string;
  value: boolean;
  onToggle: () => void;
  colors: Record<string, string>;
  isDark: boolean;
}) {
  const trackBg = value ? colors.accent : isDark ? "rgba(255,255,255,0.16)" : "rgba(15,23,42,0.14)";
  const thumbBg = value ? "#fff" : isDark ? "rgba(255,255,255,0.85)" : "#fff";

  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onToggle();
      }}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 14,
        paddingHorizontal: 14,
        borderRadius: radius.xl,
        backgroundColor: pressed ? "rgba(255,255,255,0.06)" : "transparent",
      })}
    >
      <Ionicons name={icon as any} size={24} color={colors.textPrimary} />
      <View style={{ marginLeft: 14, flex: 1 }}>
        <Text style={{ fontFamily: fonts.heading3, fontSize: 16, color: colors.textPrimary }}>
          {title}
        </Text>
        <Text style={{ marginTop: 2, fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.textSecondary }}>
          {subtitle}
        </Text>
      </View>

      <View
        style={{
          width: 54,
          height: 32,
          borderRadius: radius.pill,
          backgroundColor: trackBg,
          padding: 3,
          alignItems: value ? "flex-end" : "flex-start",
          justifyContent: "center",
        }}
      >
        <View
          style={{
            width: 26,
            height: 26,
            borderRadius: 13,
            backgroundColor: thumbBg,
          }}
        />
      </View>
    </Pressable>
  );
}
