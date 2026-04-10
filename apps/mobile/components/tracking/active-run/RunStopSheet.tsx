import React from "react";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated from "react-native-reanimated";
import { fonts, radius, icons as themeIcons } from "@/constants/theme";
import {
  formatDistanceKm,
  formatDurationClock,
} from "../../../lib/tracking/runUtils";

interface RunStopSheetProps {
  isVisible: boolean;
  sheetStyle: any;
  distanceMeters: number;
  elapsedSeconds: number;
  onFinish: () => void;
  onResume: () => void;
  colors: any;
  insetsBottom: number;
}

export function RunStopSheet({
  isVisible,
  sheetStyle,
  distanceMeters,
  elapsedSeconds,
  onFinish,
  onResume,
  colors,
  insetsBottom,
}: RunStopSheetProps) {
  if (!isVisible) return null;

  return (
    <>
      {/* Backdrop */}
      <View
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0,0,0,0.6)",
          zIndex: 90,
        }}
      />

      {/* Sheet */}
      <Animated.View
        style={[
          sheetStyle,
          {
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: colors.surfaceHigh,
            borderTopColor: colors.borderMid,
            borderTopWidth: 1,
            borderTopLeftRadius: 32,
            borderTopRightRadius: 32,
            paddingTop: 16,
            paddingHorizontal: 24,
            paddingBottom: 32 + insetsBottom,
            zIndex: 100,
          },
        ]}
      >
        {/* Handle bar */}
        <View
          style={{
            width: 36,
            height: 4,
            backgroundColor: colors.surfaceHigher,
            borderRadius: radius.pill,
            alignSelf: "center",
            marginBottom: 24,
          }}
        />

        <View style={{ alignItems: "center", marginBottom: 24 }}>
          <Ionicons
            name={themeIcons.stop.name as any}
            size={36}
            color={colors.coral}
            style={{ marginBottom: 16 }}
          />
          <Text
            style={{
              fontFamily: fonts.heading1,
              fontSize: 26,
              color: colors.textPrimary,
            }}
          >
            End this run?
          </Text>
        </View>

        <View style={{ flexDirection: "row", gap: 12, marginBottom: 32 }}>
          <View
            style={{
              flex: 1,
              backgroundColor: colors.surface,
              borderColor: colors.borderSubtle,
              borderWidth: 1,
              borderRadius: radius.xl,
              padding: 16,
              alignItems: "center",
            }}
          >
            <Text
              style={{
                fontFamily: fonts.statNumber,
                fontSize: 28,
                color: colors.textPrimary,
                fontVariant: ["tabular-nums"],
              }}
            >
              {formatDistanceKm(distanceMeters, 2)}
            </Text>
            <Text
              style={{
                fontFamily: fonts.labelCaps,
                fontSize: 11,
                letterSpacing: 2,
                color: colors.textSecondary,
              }}
            >
              KM
            </Text>
          </View>
          <View
            style={{
              flex: 1,
              backgroundColor: colors.surface,
              borderColor: colors.borderSubtle,
              borderWidth: 1,
              borderRadius: radius.xl,
              padding: 16,
              alignItems: "center",
            }}
          >
            <Text
              style={{
                fontFamily: fonts.statNumber,
                fontSize: 28,
                color: colors.textPrimary,
                fontVariant: ["tabular-nums"],
              }}
            >
              {formatDurationClock(elapsedSeconds)}
            </Text>
            <Text
              style={{
                fontFamily: fonts.labelCaps,
                fontSize: 11,
                letterSpacing: 2,
                color: colors.textSecondary,
              }}
            >
              TIME
            </Text>
          </View>
        </View>

        <Pressable
          onPress={onFinish}
          style={{
            width: "100%",
            height: 68,
            backgroundColor: colors.coral,
            borderRadius: radius.xxl,
            flexDirection: "row",
            justifyContent: "center",
            alignItems: "center",
            marginBottom: 12,
          }}
        >
          <Ionicons
            name={themeIcons.save.name as any}
            size={24}
            color={colors.textPrimary}
            style={{ marginRight: 8 }}
          />
          <Text
            style={{
              fontFamily: fonts.heading1,
              fontSize: 18,
              color: colors.textPrimary,
            }}
          >
            YES, FINISH
          </Text>
        </Pressable>

        <Pressable
          onPress={onResume}
          style={{
            width: "100%",
            height: 56,
            backgroundColor: "transparent",
            borderColor: colors.borderSubtle,
            borderWidth: 1,
            borderRadius: radius.xxl,
            flexDirection: "row",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Text
            style={{
              fontFamily: fonts.heading3,
              fontSize: 16,
              color: colors.textSecondary,
            }}
          >
            Keep going
          </Text>
        </Pressable>
      </Animated.View>
    </>
  );
}
