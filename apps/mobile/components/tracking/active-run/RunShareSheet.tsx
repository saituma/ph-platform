import React from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { Text } from "@/components/ScaledText";
import { formatDurationClock } from "@/lib/tracking/runUtils";

type Props = {
  visible: boolean;
  distanceMeters: number;
  durationSeconds: number;
  onShare: () => void;
  onSkip: () => void;
};

function formatPace(distanceMeters: number, durationSeconds: number): string {
  const km = distanceMeters / 1000;
  if (km <= 0 || durationSeconds <= 0) return "--:--";
  const secPerKm = durationSeconds / km;
  const mins = Math.floor(secPerKm / 60);
  const secs = Math.round(secPerKm % 60);
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statPill}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export function RunShareSheet({ visible, distanceMeters, durationSeconds, onShare, onSkip }: Props) {
  const insets = useSafeAreaInsets();
  const km = (distanceMeters / 1000).toFixed(2);
  const time = formatDurationClock(durationSeconds);
  const pace = formatPace(distanceMeters, durationSeconds);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onSkip}>
      <Pressable style={styles.backdrop} onPress={onSkip} />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + 20 }]}>
        <View style={styles.handle} />

        <View style={styles.statsRow}>
          <StatPill label="Distance" value={`${km} km`} />
          <StatPill label="Duration" value={time} />
          <StatPill label="Pace" value={`${pace} /km`} />
        </View>

        <Text style={styles.heading}>Share with team?</Text>
        <Text style={styles.sub}>Post this run to your team's activity feed.</Text>

        <View style={styles.buttons}>
          <Pressable
            style={styles.shareBtn}
            onPressIn={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)}
            onPress={onShare}
          >
            <Text style={styles.shareBtnText}>Share with team</Text>
          </Pressable>
          <Pressable
            style={styles.skipBtn}
            onPressIn={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
            onPress={onSkip}
          >
            <Text style={styles.skipBtnText}>Keep private</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  sheet: {
    backgroundColor: "#111",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingHorizontal: 20,
    gap: 14,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignSelf: "center",
    marginBottom: 4,
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
  },
  statPill: {
    flex: 1,
    backgroundColor: "#1c1c1c",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: "center",
    gap: 4,
  },
  statValue: {
    fontFamily: "Outfit-Bold",
    fontSize: 15,
    color: "#fff",
    letterSpacing: -0.3,
  },
  statLabel: {
    fontFamily: "Outfit-Regular",
    fontSize: 10,
    color: "rgba(255,255,255,0.4)",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  heading: {
    fontFamily: "Outfit-Bold",
    fontSize: 22,
    color: "#fff",
    letterSpacing: -0.5,
  },
  sub: {
    fontFamily: "Outfit-Regular",
    fontSize: 14,
    color: "rgba(255,255,255,0.45)",
    marginTop: -6,
  },
  buttons: {
    gap: 10,
    marginTop: 4,
  },
  shareBtn: {
    backgroundColor: "#22C55E",
    borderRadius: 50,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
  },
  shareBtnText: {
    fontFamily: "Outfit-Bold",
    fontSize: 17,
    color: "#fff",
  },
  skipBtn: {
    backgroundColor: "#1e1e1e",
    borderRadius: 50,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
  },
  skipBtnText: {
    fontFamily: "Outfit-Regular",
    fontSize: 17,
    color: "rgba(255,255,255,0.55)",
  },
});
