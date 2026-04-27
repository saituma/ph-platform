import React, { useMemo, useState } from "react";
import { Alert, Pressable, Switch, View } from "react-native";
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
import { fonts } from "@/constants/theme";
import { useRunStore } from "@/store/useRunStore";

export type ActiveRunSheetIndex = -1 | 0 | 1;

export function ActiveRunSheet({
  index,
  setIndex,
  status: _status,
  colors,
  isDark,
  mainTabBarOverlap,
  onPrimaryPress: _onPrimaryPress,
  onShareLiveLocation,
  onFinishRun,
  onIndexChange,
  autoPauseEnabled,
  onToggleAutoPause,
  audioCuesEnabled,
  onToggleAudioCues,
}: {
  index: ActiveRunSheetIndex;
  setIndex: (index: ActiveRunSheetIndex) => void;
  status: "idle" | "running" | "paused" | "stopped";
  colors: Record<string, string>;
  isDark: boolean;
  mainTabBarOverlap: number;
  onPrimaryPress: () => void;
  onShareLiveLocation: () => void;
  onFinishRun: () => void;
  onIndexChange?: (index: ActiveRunSheetIndex) => void;
  autoPauseEnabled: boolean;
  onToggleAutoPause: () => void;
  audioCuesEnabled: boolean;
  onToggleAudioCues: () => void;
}) {
  const snapPoints = useMemo(() => ["50%", "80%"] as const, []);
  const [trackLaps, setTrackLaps] = useState(false);
  const shareLiveLocationEnabled = useRunStore((s) => s.shareLiveLocationEnabled);
  const animatedSheetIndex = useSharedValue<number>(index >= 0 ? index : -1);

  // Design tokens — robis principles: tinted not pure, low saturation
  const sheetBg = isDark ? "hsl(220, 8%, 10%)" : "hsl(220, 5%, 98%)";
  const cardBg = isDark ? "hsl(220, 8%, 14%)" : "hsl(220, 5%, 94%)";
  // In dark mode: border for elevation instead of shadow
  const cardBorder = isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.07)";
  const handleColor = isDark ? "rgba(255,255,255,0.20)" : "rgba(15,23,42,0.18)";
  const labelColor = isDark ? "hsl(220, 5%, 55%)" : "hsl(220, 5%, 45%)";

  const contentAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      animatedSheetIndex.value,
      [0, 0.2, 1],
      [0.6, 0.85, 1],
      Extrapolation.CLAMP,
    ),
    transform: [
      {
        translateY: interpolate(
          animatedSheetIndex.value,
          [0, 1],
          [10, 0],
          Extrapolation.CLAMP,
        ),
      },
    ],
  }));

  const handleFinish = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(
      "End run?",
      "This will stop tracking and save your run.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "End Run", style: "destructive", onPress: onFinishRun },
      ],
    );
  };

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
          opacity={0.4}
          pressBehavior="close"
        />
      )}
      backgroundStyle={{
        backgroundColor: sheetBg,
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        // Dark mode: border instead of shadow
        borderWidth: isDark ? 1 : 0,
        borderColor: cardBorder,
      }}
      handleIndicatorStyle={{
        backgroundColor: handleColor,
        width: 36,
        height: 4,
        borderRadius: 2,
      }}
    >
      {index >= 0 ? (
        <BottomSheetScrollView
          showsVerticalScrollIndicator={false}
          bounces={false}
          overScrollMode="never"
          contentContainerStyle={{
            flexGrow: 1,
            paddingBottom: mainTabBarOverlap + 16,
          }}
        >
          <Animated.View
            style={[
              {
                paddingHorizontal: 20,
                paddingTop: 8,
                gap: 12,
              },
              contentAnimatedStyle,
            ]}
          >
            {/* Section label */}
            <Text
              style={{
                fontFamily: fonts.bodyBold,
                fontSize: 11,
                letterSpacing: 1.2,
                color: labelColor,
                textTransform: "uppercase",
                paddingLeft: 4,
                marginBottom: 4,
              }}
            >
              Run Options
            </Text>

            {/* Toggles card — outer radius 20, padding 4 → inner rows get radius 16 */}
            <View
              style={{
                backgroundColor: cardBg,
                borderRadius: 20,
                borderWidth: 1,
                borderColor: cardBorder,
                paddingHorizontal: 4,
                paddingVertical: 4,
                gap: 0,
              }}
            >
              <ToggleRow
                icon={shareLiveLocationEnabled ? "share-social" : "share-social-outline"}
                title="Share live location"
                subtitle="Let teammates see you on the map"
                value={shareLiveLocationEnabled}
                onToggle={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onShareLiveLocation();
                }}
                isDark={isDark}
                accent={colors.accent}
              />

              <View
                style={{
                  height: 1,
                  backgroundColor: cardBorder,
                  marginHorizontal: 12,
                }}
              />

              <ToggleRow
                icon={trackLaps ? "repeat" : "repeat-outline"}
                title="Track laps"
                subtitle="Manually record lap splits"
                value={trackLaps}
                onToggle={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setTrackLaps((v) => !v);
                }}
                isDark={isDark}
                accent={colors.accent}
              />

              <View
                style={{
                  height: 1,
                  backgroundColor: cardBorder,
                  marginHorizontal: 12,
                }}
              />

              <ToggleRow
                icon={autoPauseEnabled ? "pause-circle" : "pause-circle-outline"}
                title="Auto-pause"
                subtitle="Pause when you stop moving"
                value={autoPauseEnabled}
                onToggle={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onToggleAutoPause();
                }}
                isDark={isDark}
                accent={colors.accent}
              />

              <View
                style={{
                  height: 1,
                  backgroundColor: cardBorder,
                  marginHorizontal: 12,
                }}
              />

              <ToggleRow
                icon={audioCuesEnabled ? "volume-high" : "volume-high-outline"}
                title="Audio cues"
                subtitle="Voice announcements at each kilometer"
                value={audioCuesEnabled}
                onToggle={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onToggleAudioCues();
                }}
                isDark={isDark}
                accent={colors.accent}
              />
            </View>

            {/* End Run button — full width, destructive */}
            <Pressable
              onPress={handleFinish}
              style={({ pressed }) => ({
                height: 56,
                borderRadius: 16,
                backgroundColor: isDark
                  ? "hsl(0, 25%, 18%)"
                  : "hsl(0, 30%, 94%)",
                borderWidth: 1,
                borderColor: isDark
                  ? "hsl(0, 25%, 30%)"
                  : "hsl(0, 30%, 82%)",
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                marginTop: 8,
                opacity: pressed ? 0.85 : 1,
                transform: [{ scale: pressed ? 0.98 : 1 }],
              })}
            >
              <Ionicons
                name="stop-circle-outline"
                size={20}
                color="hsl(0, 45%, 52%)"
              />
              <Text
                style={{
                  fontFamily: fonts.heading2,
                  fontSize: 16,
                  color: "hsl(0, 45%, 52%)",
                }}
              >
                End Run
              </Text>
            </Pressable>
          </Animated.View>
        </BottomSheetScrollView>
      ) : (
        <BottomSheetView style={{ height: 0 }}>
          <View />
        </BottomSheetView>
      )}
    </BottomSheet>
  );
}

function ToggleRow({
  icon,
  title,
  subtitle,
  value,
  onToggle,
  isDark,
  accent,
}: {
  icon: string;
  title: string;
  subtitle: string;
  value: boolean;
  onToggle: () => void;
  isDark: boolean;
  accent: string;
}) {
  // Icon bg: tinted accent when on, neutral when off — low saturation per robis
  const iconBg = value
    ? isDark ? "rgba(200,241,53,0.12)" : "rgba(200,241,53,0.16)"
    : isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.05)";
  const iconColor = value ? accent : (isDark ? "hsl(220,5%,55%)" : "hsl(220,5%,45%)");
  // Text: tinted, not pure — robis principle
  const titleColor = isDark ? "hsl(220,5%,92%)" : "hsl(220,8%,12%)";
  const subtitleColor = isDark ? "hsl(220,5%,52%)" : "hsl(220,5%,48%)";

  return (
    <Pressable
      onPress={onToggle}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel={title}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        // outer card radius 20, padding 4 → row radius = 20 - 4 = 16
        borderRadius: 16,
        paddingHorizontal: 12,
        paddingVertical: 14,
        gap: 12,
        backgroundColor: pressed
          ? isDark ? "rgba(255,255,255,0.04)" : "rgba(15,23,42,0.03)"
          : "transparent",
      })}
    >
      {/* Icon container: outer row px=12, so icon wrap radius = 16 - 12 = 4... use 8 for feel */}
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          backgroundColor: iconBg,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons name={icon as any} size={19} color={iconColor} />
      </View>

      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ fontFamily: fonts.bodyBold, fontSize: 15, color: titleColor }}>
          {title}
        </Text>
        <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 12, color: subtitleColor }}>
          {subtitle}
        </Text>
      </View>

      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{
          false: isDark ? "rgba(255,255,255,0.14)" : "rgba(15,23,42,0.14)",
          true: accent,
        }}
        thumbColor={value
          ? isDark ? "hsl(220,5%,92%)" : "hsl(220,5%,98%)"
          : isDark ? "hsl(220,5%,75%)" : "hsl(220,5%,96%)"}
        ios_backgroundColor={isDark ? "rgba(255,255,255,0.14)" : "rgba(15,23,42,0.14)"}
      />
    </Pressable>
  );
}
