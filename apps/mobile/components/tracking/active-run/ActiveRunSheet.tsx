import React, { useMemo, useState } from "react";
import { Alert, Pressable, View } from "react-native";
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetScrollView,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";

import { Text } from "@/components/ScaledText";
import { fonts, radius } from "@/constants/theme";
import { useRunStore } from "@/store/useRunStore";

export type ActiveRunSheetIndex = -1 | 0 | 1;

export function ActiveRunSheet({
  index,
  setIndex,
  status,
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
  colors: Record<string, string>;
  isDark: boolean;
  mainTabBarOverlap: number;
  onPrimaryPress: () => void;
  onAddRoute: () => void;
  onShareLiveLocation: () => void;
  onFinishRun: () => void;
  onIndexChange?: (index: ActiveRunSheetIndex) => void;
}) {
  const snapPoints = useMemo(() => ["62%", "90%"] as const, []);
  const [trackLaps, setTrackLaps] = useState(false);
  const shareLiveLocationEnabled = useRunStore((s) => s.shareLiveLocationEnabled);
  const animatedSheetIndex = useSharedValue<number>(index >= 0 ? index : -1);

  const cardBg = isDark ? "rgba(18,18,18,0.94)" : "rgba(255,255,255,0.96)";
  const cardBorder = isDark ? "rgba(255,255,255,0.10)" : "rgba(15,23,42,0.10)";
  const contentAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      animatedSheetIndex.value,
      [0, 0.15, 0.75],
      [0.75, 0.9, 1],
      Extrapolation.CLAMP,
    ),
    transform: [
      {
        translateY: interpolate(
          animatedSheetIndex.value,
          [0, 1],
          [14, 0],
          Extrapolation.CLAMP,
        ),
      },
    ],
  }));

  return (
    <BottomSheet
      index={index}
      animatedIndex={animatedSheetIndex}
      snapPoints={snapPoints as any}
      onChange={(next) => {
        const idx = (next >= 0 ? next : -1) as ActiveRunSheetIndex;
        setIndex(idx);
        onIndexChange?.(idx);
      }}
      enablePanDownToClose
      enableOverDrag={false}
      enableDynamicSizing={false}
      bottomInset={0}
      backdropComponent={(props) => (
        <BottomSheetBackdrop
          {...props}
          appearsOnIndex={0}
          disappearsOnIndex={-1}
          opacity={0.45}
          pressBehavior="close"
        />
      )}
      backgroundStyle={{
        backgroundColor: cardBg,
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        borderWidth: 1,
        borderColor: cardBorder,
      }}
      style={{ left: 0, right: 0 }}
      handleIndicatorStyle={{
        backgroundColor: isDark ? "rgba(255,255,255,0.30)" : "rgba(15,23,42,0.22)",
        width: 44,
      }}
    >
      {index >= 0 ? (
        <BottomSheetScrollView
          showsVerticalScrollIndicator={false}
          bounces={false}
          overScrollMode="never"
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: 0,
            paddingBottom: mainTabBarOverlap,
          }}
        >
          <View
            style={{
              paddingTop: 12,
              paddingHorizontal: 20,
              paddingBottom: 22,
              minHeight: 420,
            }}
          >
            <Animated.View style={[{ gap: 10 }, contentAnimatedStyle]}>
              <View
                style={{
                  backgroundColor: "#020202",
                  borderRadius: 26,
                  paddingHorizontal: 18,
                  paddingVertical: 10,
                  marginTop: 10,
                }}
              >
              <SheetRow
                icon="share-social-outline"
                title="Share live location"
                subtitle={shareLiveLocationEnabled ? "On" : "Off"}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onShareLiveLocation();
                }}
                colors={colors}
              />
              <SheetDivider colors={colors} />
              <SheetToggleRow
                icon="repeat-outline"
                title="Track laps"
                subtitle="Manually track lap times"
                value={trackLaps}
                onToggle={() => setTrackLaps((v) => !v)}
                colors={colors}
                isDark={isDark}
              />
              <SheetDivider colors={colors} />
              <SheetRow
                icon="pulse-outline"
                title="Add a sensor"
                subtitle="Connect heart-rate or footpod"
                onPress={() => {
                  Alert.alert("Coming soon", "Sensor integrations will be added later.");
                }}
                colors={colors}
              />
              <SheetDivider colors={colors} />
              <SheetRow
                icon="settings-outline"
                title="Settings"
                subtitle="Audio cues, auto-pause, route options"
                onPress={() => {
                  Alert.alert("Coming soon", "More run settings will be added later.");
                }}
                colors={colors}
              />
              </View>

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
                  marginTop: 16,
                })}
              >
                <Text style={{ fontFamily: fonts.heading2, fontSize: 16, color: "#EF4444" }}>
                  Finish run
                </Text>
              </Pressable>
            </Animated.View>
          </View>
        </BottomSheetScrollView>
      ) : (
        <BottomSheetView style={{ height: 0 }}>
          <View />
        </BottomSheetView>
      )}
    </BottomSheet>
  );
}

function SheetDivider({ colors }: { colors: Record<string, string> }) {
  return (
    <View
      style={{
        height: 1,
        backgroundColor: "rgba(255,255,255,0.12)",
        marginLeft: 50,
      }}
    />
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
        paddingVertical: 18,
        paddingHorizontal: 6,
        borderRadius: radius.xl,
        backgroundColor: pressed ? "rgba(255,255,255,0.05)" : "transparent",
      })}
    >
      <Ionicons name={icon as any} size={24} color={colors.textPrimary} />
      <View style={{ marginLeft: 14, flex: 1 }}>
        <Text style={{ fontFamily: fonts.heading3, fontSize: 16, color: colors.textPrimary }}>
          {title}
        </Text>
        <Text style={{ marginTop: 2, fontFamily: fonts.bodyMedium, fontSize: 13, color: "#D4D4D8" }}>
          {subtitle}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#7A7A80" />
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
        paddingVertical: 18,
        paddingHorizontal: 6,
        borderRadius: radius.xl,
        backgroundColor: pressed ? "rgba(255,255,255,0.05)" : "transparent",
      })}
    >
      <Ionicons name={icon as any} size={24} color={colors.textPrimary} />
      <View style={{ marginLeft: 14, flex: 1 }}>
        <Text style={{ fontFamily: fonts.heading3, fontSize: 16, color: colors.textPrimary }}>
          {title}
        </Text>
        <Text style={{ marginTop: 2, fontFamily: fonts.bodyMedium, fontSize: 13, color: "#D4D4D8" }}>
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
