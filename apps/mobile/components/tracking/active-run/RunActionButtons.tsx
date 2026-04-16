import React from "react";
import { View, Pressable, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { fonts, radius, icons as themeIcons } from "@/constants/theme";

interface RunActionButtonsProps {
  status: "idle" | "running" | "paused" | "finished" | "stopped";
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  colors: any;
  glassBg: string;
  glassBorder: string;
  glassShadow: any;
  /** Clearance for the root floating tab bar (`SwipeableTabLayout`). */
  mainTabBarOverlap: number;
  bottomBarHeight: number;
  overlayGap: number;
}

export function RunActionButtons({
  status,
  onPause,
  onResume,
  onStop,
  colors,
  glassBg,
  glassBorder,
  glassShadow,
  mainTabBarOverlap,
  bottomBarHeight,
  overlayGap,
}: RunActionButtonsProps) {
  const isPaused = status === "paused";

  return (
    <View
      style={{
        position: "absolute",
        left: 16,
        right: 16,
        bottom: mainTabBarOverlap + bottomBarHeight + overlayGap + 8,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={isPaused ? "Resume run" : "Pause run"}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          if (isPaused) {
            onResume();
          } else {
            onPause();
          }
        }}
        style={({ pressed }) => ({
          height: 56,
          minWidth: 140,
          borderRadius: radius.pill,
          backgroundColor: isPaused ? colors.lime : glassBg,
          borderWidth: 1,
          borderColor: isPaused ? colors.borderLime : glassBorder,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 16,
          opacity: pressed ? 0.82 : 1,
          transform: [{ scale: pressed ? 0.985 : 1 }],
          ...glassShadow,
        })}
      >
        <Ionicons
          name={(isPaused ? themeIcons.resume.name : themeIcons.pause.name) as any}
          size={20}
          color={isPaused ? colors.textInverse : colors.textPrimary}
          style={{ marginRight: 8 }}
        />
        <Text
          style={{
            fontFamily: fonts.heading2,
            fontSize: 14,
            color: isPaused ? colors.textInverse : colors.textPrimary,
            letterSpacing: 0.6,
          }}
        >
          {isPaused ? "RESUME" : "PAUSE"}
        </Text>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Stop run"
        onPress={onStop}
        style={({ pressed }) => ({
          height: 56,
          minWidth: 120,
          borderRadius: radius.pill,
          backgroundColor: colors.coralGlow,
          borderWidth: 1,
          borderColor: colors.borderCoral,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 16,
          opacity: pressed ? 0.82 : 1,
          transform: [{ scale: pressed ? 0.985 : 1 }],
          ...glassShadow,
        })}
      >
        <Ionicons
          name={themeIcons.stop.name as any}
          size={20}
          color={colors.coral}
          style={{ marginRight: 8 }}
        />
        <Text
          style={{
            fontFamily: fonts.heading2,
            fontSize: 14,
            color: colors.coral,
            letterSpacing: 0.6,
          }}
        >
          STOP
        </Text>
      </Pressable>
    </View>
  );
}
