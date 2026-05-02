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

// ── SkeletonThreadScreen ────────────────────────────────────────────

export const SkeletonThreadScreen = memo(function SkeletonThreadScreen() {
  const { width } = useWindowDimensions();
  const rowW = width - SPACING.xl * 2;

  return (
    <View style={styles.screenPad}>
      {/* Header bar */}
      <View style={[styles.row, { marginBottom: SPACING.xl }]}>
        <SkeletonBox width={32} height={32} borderRadius={16} />
        <View style={{ flex: 1, marginLeft: SPACING.md, gap: SPACING.xs }}>
          <SkeletonBox width={140} height={16} borderRadius={4} />
          <SkeletonBox width={80} height={12} borderRadius={4} />
        </View>
      </View>

      {/* Message bubbles */}
      {[0.7, 0.5, 0.85, 0.4, 0.6].map((widthFrac, i) => {
        const isOwn = i % 2 === 1;
        return (
          <View
            key={i}
            style={{
              alignSelf: isOwn ? "flex-end" : "flex-start",
              marginBottom: SPACING.md,
              gap: SPACING.xs,
            }}
          >
            {!isOwn && (
              <View style={{ flexDirection: "row", alignItems: "center", gap: SPACING.sm }}>
                <SkeletonBox width={28} height={28} borderRadius={14} />
                <SkeletonBox width={60} height={11} borderRadius={4} />
              </View>
            )}
            <SkeletonBox
              width={Math.round(rowW * widthFrac)}
              height={isOwn ? 36 : 44}
              borderRadius={RADIUS.lg}
            />
          </View>
        );
      })}

      {/* Composer bar */}
      <View style={{ marginTop: SPACING.xl }}>
        <SkeletonBox width={rowW} height={44} borderRadius={22} />
      </View>
    </View>
  );
});

// ── SkeletonAnnouncementsScreen ─────────────────────────────────────

export const SkeletonAnnouncementsScreen = memo(function SkeletonAnnouncementsScreen() {
  const { width } = useWindowDimensions();
  const cardW = width - SPACING.xl * 2;

  return (
    <View style={styles.screenPad}>
      {/* Header */}
      <SkeletonBox width={180} height={22} borderRadius={4} style={{ marginBottom: SPACING.lg }} />

      {/* 3 announcement cards */}
      {[0, 1, 2].map((i) => (
        <View
          key={i}
          style={{
            width: cardW,
            borderRadius: RADIUS.xl,
            padding: SPACING.xl,
            gap: SPACING.sm,
            marginBottom: SPACING.md,
          }}
        >
          <View style={[styles.row, { justifyContent: "flex-start", gap: SPACING.md }]}>
            <SkeletonBox width={40} height={40} borderRadius={20} />
            <View style={{ gap: SPACING.xs }}>
              <SkeletonBox width={120} height={14} borderRadius={4} />
              <SkeletonBox width={80} height={11} borderRadius={4} />
            </View>
          </View>
          <SkeletonBox width="95%" height={14} borderRadius={4} />
          <SkeletonBox width="70%" height={14} borderRadius={4} />
          {i === 0 && (
            <SkeletonBox width={cardW - SPACING.xl * 2} height={160} borderRadius={RADIUS.lg} style={{ marginTop: SPACING.xs }} />
          )}
        </View>
      ))}
    </View>
  );
});

// ── SkeletonTrackingSocialScreen ────────────────────────────────────

export const SkeletonTrackingSocialScreen = memo(function SkeletonTrackingSocialScreen() {
  const { width } = useWindowDimensions();
  const cardW = width - SPACING.xl * 2;
  const statW = (cardW - SPACING.md * 2) / 3;

  return (
    <View style={{ paddingHorizontal: SPACING.xl, paddingTop: SPACING.md, gap: SPACING.md }}>
      {/* Overview stat cards row */}
      <View style={[styles.row, { gap: SPACING.sm }]}>
        {[0, 1, 2].map((i) => (
          <SkeletonBox key={i} width={statW} height={72} borderRadius={RADIUS.lg} />
        ))}
      </View>

      {/* Leaderboard section */}
      <SkeletonBox width={120} height={16} borderRadius={4} />
      {[0, 1, 2, 3].map((i) => (
        <View key={i} style={[styles.listRow]}>
          <SkeletonBox width={28} height={28} borderRadius={14} />
          <View style={{ flex: 1, gap: SPACING.xs }}>
            <SkeletonBox width="50%" height={14} borderRadius={4} />
            <SkeletonBox width="30%" height={11} borderRadius={4} />
          </View>
          <SkeletonBox width={48} height={14} borderRadius={4} />
        </View>
      ))}

      {/* Recent runs */}
      <SkeletonBox width={100} height={16} borderRadius={4} style={{ marginTop: SPACING.sm }} />
      {[0, 1].map((i) => (
        <SkeletonBox key={i} width={cardW} height={80} borderRadius={RADIUS.lg} />
      ))}
    </View>
  );
});

// ── SkeletonProgramDetailScreen ─────────────────────────────────────

export const SkeletonProgramDetailScreen = memo(function SkeletonProgramDetailScreen() {
  return (
    <View style={styles.screenPad}>
      {/* Description */}
      <SkeletonBox width="80%" height={14} borderRadius={4} style={{ marginBottom: SPACING.sm }} />
      <SkeletonBox width="60%" height={14} borderRadius={4} style={{ marginBottom: SPACING.xl }} />

      {/* Module cards */}
      {[0, 1, 2].map((i) => (
        <View
          key={i}
          style={{
            borderRadius: RADIUS.xl,
            padding: SPACING.xl,
            gap: SPACING.sm,
            marginBottom: SPACING.md,
          }}
        >
          <View style={[styles.row, { justifyContent: "flex-start", gap: SPACING.md }]}>
            <SkeletonBox width={44} height={44} borderRadius={RADIUS.md} />
            <View style={{ flex: 1, gap: SPACING.xs }}>
              <SkeletonBox width="70%" height={16} borderRadius={4} />
              <SkeletonBox width="40%" height={12} borderRadius={4} />
            </View>
            <SkeletonBox width={20} height={20} borderRadius={4} />
          </View>
        </View>
      ))}
    </View>
  );
});

// ── SkeletonSessionScreen ───────────────────────────────────────────

export const SkeletonSessionScreen = memo(function SkeletonSessionScreen() {
  return (
    <View style={styles.screenPad}>
      {/* Session title area */}
      <SkeletonBox width="65%" height={22} borderRadius={4} style={{ marginBottom: SPACING.sm }} />
      <SkeletonBox width="45%" height={13} borderRadius={4} style={{ marginBottom: SPACING.xl }} />

      {/* Exercise blocks */}
      {[0, 1, 2].map((i) => (
        <View
          key={i}
          style={{
            borderRadius: RADIUS.xl,
            padding: SPACING.lg,
            gap: SPACING.md,
            marginBottom: SPACING.md,
          }}
        >
          <View style={[styles.row, { justifyContent: "flex-start", gap: SPACING.md }]}>
            <SkeletonBox width={48} height={48} borderRadius={RADIUS.md} />
            <View style={{ flex: 1, gap: SPACING.xs }}>
              <SkeletonBox width="60%" height={16} borderRadius={4} />
              <SkeletonBox width="35%" height={12} borderRadius={4} />
            </View>
          </View>
          {/* Sets row */}
          <View style={[styles.row, { gap: SPACING.sm }]}>
            {[0, 1, 2].map((j) => (
              <SkeletonBox key={j} width={64} height={28} borderRadius={RADIUS.sm} />
            ))}
          </View>
        </View>
      ))}
    </View>
  );
});

// ── SkeletonNutritionLogScreen ──────────────────────────────────────

export const SkeletonNutritionLogScreen = memo(function SkeletonNutritionLogScreen() {
  const { width } = useWindowDimensions();
  const cardW = width - SPACING.xl * 2;

  return (
    <View style={{ paddingHorizontal: SPACING.lg, paddingTop: SPACING.md, gap: SPACING.lg }}>
      {/* Macro summary card */}
      <SkeletonBox width={cardW} height={100} borderRadius={RADIUS.xl} />

      {/* Meal entries */}
      {["Breakfast", "Lunch", "Dinner"].map((_, i) => (
        <View key={i} style={{ gap: SPACING.sm }}>
          <SkeletonBox width={90} height={14} borderRadius={4} />
          <View
            style={{
              borderRadius: RADIUS.lg,
              padding: SPACING.lg,
              gap: SPACING.sm,
            }}
          >
            <SkeletonBox width="70%" height={14} borderRadius={4} />
            <SkeletonBox width="50%" height={12} borderRadius={4} />
            <SkeletonBox width="40%" height={12} borderRadius={4} />
          </View>
        </View>
      ))}
    </View>
  );
});

// ── SkeletonTrainingContentScreen ───────────────────────────────────

export const SkeletonTrainingContentScreen = memo(function SkeletonTrainingContentScreen() {
  const { width } = useWindowDimensions();
  const cardW = width - SPACING.xl * 2;
  const videoH = Math.round((cardW * 9) / 16);

  return (
    <View style={styles.screenPad}>
      {/* Category pill */}
      <SkeletonBox width={80} height={20} borderRadius={10} style={{ marginBottom: SPACING.md }} />

      {/* Title */}
      <SkeletonBox width="80%" height={28} borderRadius={4} style={{ marginBottom: SPACING.sm }} />

      {/* Schedule badge row */}
      <View style={[styles.row, { justifyContent: "flex-start", gap: SPACING.sm, marginBottom: SPACING.xl }]}>
        <SkeletonBox width={80} height={24} borderRadius={12} />
        <SkeletonBox width={60} height={24} borderRadius={12} />
      </View>

      {/* Video placeholder */}
      <SkeletonBox width={cardW} height={videoH} borderRadius={RADIUS.lg} style={{ marginBottom: SPACING.xl }} />

      {/* Body text lines */}
      <SkeletonBox width="95%" height={14} borderRadius={4} style={{ marginBottom: SPACING.sm }} />
      <SkeletonBox width="85%" height={14} borderRadius={4} style={{ marginBottom: SPACING.sm }} />
      <SkeletonBox width="70%" height={14} borderRadius={4} />
    </View>
  );
});

// ── SkeletonNotificationsScreen ─────────────────────────────────────

export const SkeletonNotificationsScreen = memo(function SkeletonNotificationsScreen() {
  return (
    <View style={styles.screenPad}>
      {/* Section heading */}
      <SkeletonBox width={60} height={11} borderRadius={4} style={{ marginBottom: SPACING.md }} />

      {/* Notification rows */}
      {[0, 1, 2, 3, 4].map((i) => (
        <View key={i} style={[styles.listRow, { paddingVertical: SPACING.md }]}>
          <SkeletonBox width={40} height={40} borderRadius={RADIUS.md} />
          <View style={{ flex: 1, gap: SPACING.xs }}>
            <SkeletonBox width="65%" height={14} borderRadius={4} />
            <SkeletonBox width="90%" height={12} borderRadius={4} />
            <SkeletonBox width={50} height={10} borderRadius={4} />
          </View>
        </View>
      ))}

      {/* Second section */}
      <SkeletonBox width={80} height={11} borderRadius={4} style={{ marginTop: SPACING.lg, marginBottom: SPACING.md }} />
      {[0, 1, 2].map((i) => (
        <View key={i} style={[styles.listRow, { paddingVertical: SPACING.md }]}>
          <SkeletonBox width={40} height={40} borderRadius={RADIUS.md} />
          <View style={{ flex: 1, gap: SPACING.xs }}>
            <SkeletonBox width="55%" height={14} borderRadius={4} />
            <SkeletonBox width="80%" height={12} borderRadius={4} />
            <SkeletonBox width={50} height={10} borderRadius={4} />
          </View>
        </View>
      ))}
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
