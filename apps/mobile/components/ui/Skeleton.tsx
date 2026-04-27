import React, { memo, useEffect } from "react";
import { View, useColorScheme, useWindowDimensions, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  useReducedMotion,
} from "react-native-reanimated";

// ── Design tokens (must match real layouts exactly) ──────────────────

const SPACING = { xs: 6, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24 };
const RADIUS = { sm: 8, md: 12, lg: 16, xl: 20 };

// ── SkeletonBox ──────────────────────────────────────────────────────

interface SkeletonBoxProps {
  width: number | `${number}%`;
  height: number;
  borderRadius?: number;
  style?: any;
}

export const SkeletonBox = memo(function SkeletonBox({
  width,
  height,
  borderRadius = RADIUS.md,
  style,
}: SkeletonBoxProps) {
  const scheme = useColorScheme();
  const reduceMotion = useReducedMotion();
  const bg = scheme === "dark" ? "#1E1E1E" : "#E5E5EA";

  const opacity = useSharedValue(reduceMotion ? 0.5 : 0.3);

  useEffect(() => {
    if (reduceMotion) return;
    opacity.value = withRepeat(
      withTiming(0.7, { duration: 800, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [opacity, reduceMotion]);

  const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[
        { width, height, borderRadius, backgroundColor: bg },
        animStyle,
        style,
      ]}
    />
  );
});

// ── SkeletonHomeScreen ───────────────────────────────────────────────

export const SkeletonHomeScreen = memo(function SkeletonHomeScreen() {
  const { width } = useWindowDimensions();
  const cardW = width - SPACING.xl * 2;
  const statW = (cardW - SPACING.md * 2) / 3;
  const videoH = Math.round((cardW * 9) / 16);

  return (
    <View style={[styles.screenPad, { gap: SPACING.md }]}>
      {/* Hero card */}
      <SkeletonBox width={cardW} height={200} borderRadius={RADIUS.xl} />

      {/* Quick stats row — 3 cards */}
      <View style={[styles.row, { gap: SPACING.md }]}>
        {[0, 1, 2].map((i) => (
          <SkeletonBox key={i} width={statW} height={80} borderRadius={RADIUS.lg} />
        ))}
      </View>

      {/* Quick links — 4 icon buttons in a row */}
      <SkeletonBox width={cardW} height={100} borderRadius={RADIUS.xl} />

      {/* Intro video */}
      <View style={{ gap: SPACING.sm }}>
        <SkeletonBox width={140} height={16} borderRadius={4} />
        <SkeletonBox width={cardW} height={videoH} borderRadius={RADIUS.xl} />
      </View>

      {/* Admin story card */}
      <View
        style={{
          width: cardW,
          borderRadius: RADIUS.xl,
          padding: SPACING.xl,
          gap: SPACING.md,
          overflow: "hidden",
        }}
      >
        <SkeletonBox width={cardW} height={160} borderRadius={RADIUS.xl} />
        <View style={{ gap: SPACING.sm }}>
          <SkeletonBox width="60%" height={18} borderRadius={4} />
          <SkeletonBox width="85%" height={13} borderRadius={4} />
          <SkeletonBox width="70%" height={13} borderRadius={4} />
        </View>
      </View>

      {/* Testimonials — 2 cards */}
      <SkeletonBox width={100} height={16} borderRadius={4} />
      {[0, 1].map((i) => (
        <View
          key={i}
          style={{
            width: cardW,
            borderRadius: RADIUS.xl,
            gap: SPACING.sm,
            paddingVertical: SPACING.md,
          }}
        >
          <View style={[styles.row, { justifyContent: "flex-start", gap: SPACING.md }]}>
            <SkeletonBox width={44} height={44} borderRadius={22} />
            <View style={{ gap: SPACING.xs }}>
              <SkeletonBox width={120} height={15} borderRadius={4} />
              <SkeletonBox width={80} height={12} borderRadius={4} />
            </View>
          </View>
          <SkeletonBox width="90%" height={13} borderRadius={4} />
          <SkeletonBox width="75%" height={13} borderRadius={4} />
        </View>
      ))}
    </View>
  );
});

// ── SkeletonMessagingScreen ──────────────────────────────────────────

export const SkeletonMessagingScreen = memo(function SkeletonMessagingScreen() {
  const { width } = useWindowDimensions();
  const rowW = width - SPACING.xl * 2;

  return (
    <View style={styles.screenPad}>
      {/* Search bar */}
      <SkeletonBox
        width={rowW}
        height={44}
        borderRadius={RADIUS.lg}
        style={{ marginBottom: SPACING.lg }}
      />

      {/* 5 conversation rows */}
      {[0, 1, 2, 3, 4].map((i) => (
        <View key={i} style={[styles.convRow, { marginTop: i === 0 ? 0 : SPACING.sm }]}>
          {/* Avatar circle */}
          <SkeletonBox width={48} height={48} borderRadius={24} />
          {/* Text lines */}
          <View style={{ flex: 1, gap: SPACING.xs }}>
            <SkeletonBox width="60%" height={16} borderRadius={4} />
            <SkeletonBox width="85%" height={13} borderRadius={4} />
          </View>
          {/* Timestamp */}
          <SkeletonBox width={36} height={12} borderRadius={4} />
        </View>
      ))}
    </View>
  );
});

// ── SkeletonScheduleScreen ──────────────────────────────────────────

export const SkeletonScheduleScreen = memo(function SkeletonScheduleScreen() {
  const { width } = useWindowDimensions();
  const cardW = width - SPACING.xl * 2;
  const dayW = (cardW - SPACING.xs * 6) / 7;

  return (
    <View style={styles.screenPad}>
      {/* Week strip — 7 day pills */}
      <View style={[styles.row, { gap: SPACING.xs }]}>
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <SkeletonBox key={i} width={dayW} height={64} borderRadius={RADIUS.lg} />
        ))}
      </View>

      {/* 3 session cards */}
      {[0, 1, 2].map((i) => (
        <View
          key={i}
          style={[styles.sessionCard, { marginTop: i === 0 ? SPACING.xl : SPACING.md }]}
        >
          {/* Time column */}
          <View style={{ gap: SPACING.xs, width: 50 }}>
            <SkeletonBox width={50} height={20} borderRadius={4} />
            <SkeletonBox width={36} height={13} borderRadius={4} />
          </View>
          {/* Center content */}
          <View style={{ flex: 1, gap: SPACING.xs }}>
            <SkeletonBox width="70%" height={16} borderRadius={4} />
            <SkeletonBox width="45%" height={13} borderRadius={4} />
          </View>
          {/* Status chip */}
          <SkeletonBox width={72} height={24} borderRadius={12} />
        </View>
      ))}
    </View>
  );
});

// ── SkeletonProgramsScreen ──────────────────────────────────────────

export const SkeletonProgramsScreen = memo(function SkeletonProgramsScreen() {
  const { width } = useWindowDimensions();
  const cardW = width - SPACING.xl * 2;
  const gridItemW = (cardW - SPACING.md) / 2;

  return (
    <View style={styles.screenPad}>
      {/* Featured banner */}
      <SkeletonBox width={cardW} height={220} borderRadius={RADIUS.xl} />

      {/* Category pills */}
      <View style={[styles.row, { marginTop: SPACING.lg, gap: SPACING.sm }]}>
        {[80, 100, 72, 64].map((w, i) => (
          <SkeletonBox key={i} width={w} height={32} borderRadius={16} />
        ))}
      </View>

      {/* 2×2 grid */}
      <View style={styles.grid}>
        {[0, 1, 2, 3].map((i) => (
          <SkeletonBox
            key={i}
            width={gridItemW}
            height={200}
            borderRadius={RADIUS.lg}
          />
        ))}
      </View>
    </View>
  );
});

// ── SkeletonVideoPlayer ─────────────────────────────────────────────

export const SkeletonVideoPlayer = memo(function SkeletonVideoPlayer() {
  const { width } = useWindowDimensions();
  const containerW = width - SPACING.xl * 2;
  const containerH = Math.round((containerW * 9) / 16);

  return (
    <View style={{ width: containerW, height: containerH, alignSelf: "center" }}>
      <SkeletonBox width={containerW} height={containerH} borderRadius={RADIUS.lg} />
      {/* Play circle indicator */}
      <View style={styles.skeletonPlayCenter}>
        <SkeletonBox width={48} height={48} borderRadius={24} />
      </View>
    </View>
  );
});

// ── Styles ───────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screenPad: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.xl,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  listRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  convRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    paddingVertical: SPACING.sm,
    height: 72,
  },
  sessionCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.md,
    marginTop: SPACING.lg,
  },
  skeletonPlayCenter: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
});
