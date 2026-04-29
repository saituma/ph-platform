import React from "react";
import { Alert, Pressable, View, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { Text } from "@/components/ScaledText";
import { fonts } from "@/constants/theme";

const PANEL_BG = "rgba(18,18,18,0.98)";
const GREEN = "#22C55E";
const WHITE = "#FFFFFF";
const BLACK_TEXT = "#111111";
const WHITE_TEXT = "#FFFFFF";

export function ActiveRunActionDock({
  status,
  onPrimaryPress,
  onFinishRun,
  bottomInset,
}: {
  status: "idle" | "running" | "paused" | "stopped";
  colors?: Record<string, string>;
  isDark?: boolean;
  onPrimaryPress: () => void;
  onOpenSheet?: () => void;
  onFinishRun: () => void;
  bottomInset: number;
}) {
  const isRunning = status === "running";
  const isPaused = status === "paused";

  const handleFinish = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert("End run?", "This will stop tracking and save your run.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "End Run",
        style: "destructive",
        onPress: () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          onFinishRun();
        },
      },
    ]);
  };

  return (
    <View
      style={[
        styles.container,
        { paddingBottom: bottomInset + 12 },
      ]}
    >
      {/* Drag handle */}
      <View style={styles.handle} />

      {isRunning ? (
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            onPrimaryPress();
          }}
          style={styles.pauseBtn}
        >
          <Ionicons name="pause" size={26} color={WHITE_TEXT} />
          <Text style={styles.pauseLabel}>Pause</Text>
        </Pressable>

      ) : isPaused ? (
        <View style={styles.row}>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              onPrimaryPress();
            }}
            style={styles.resumeBtn}
          >
            <Ionicons name="play" size={22} color={WHITE_TEXT} />
            <Text style={styles.resumeLabel}>Resume</Text>
          </Pressable>

          <Pressable
            onPress={handleFinish}
            style={styles.finishBtn}
          >
            <Ionicons name="stop" size={20} color={BLACK_TEXT} />
            <Text style={styles.finishLabel}>Finish</Text>
          </Pressable>
        </View>

      ) : (
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            onPrimaryPress();
          }}
          style={styles.startBtn}
        >
          <Ionicons name="play" size={28} color={WHITE_TEXT} />
          <Text style={styles.startLabel}>Start</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: PANEL_BG,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.25)",
    alignSelf: "center",
    marginBottom: 16,
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  resumeBtn: {
    flex: 3,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: GREEN,
    borderRadius: 50,
    height: 64,
  },
  resumeLabel: {
    fontFamily: fonts.accentBold,
    fontSize: 20,
    color: WHITE_TEXT,
  },
  finishBtn: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: WHITE,
    borderRadius: 50,
    height: 64,
  },
  finishLabel: {
    fontFamily: fonts.accentBold,
    fontSize: 20,
    color: BLACK_TEXT,
  },
  pauseBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    backgroundColor: GREEN,
    borderRadius: 50,
    height: 64,
  },
  pauseLabel: {
    fontFamily: fonts.accentBold,
    fontSize: 20,
    color: WHITE_TEXT,
  },
  startBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    backgroundColor: GREEN,
    borderRadius: 50,
    height: 64,
  },
  startLabel: {
    fontFamily: fonts.accentBold,
    fontSize: 22,
    color: WHITE_TEXT,
  },
});
