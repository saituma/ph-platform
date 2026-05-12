import React, { useCallback, useEffect, useState } from "react";
import {
  Dimensions,
  Modal,
  Pressable,
  StyleSheet,
  View,
  useColorScheme,
} from "react-native";
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  useReducedMotion,
} from "react-native-reanimated";
import { BlurView } from "expo-blur";
import { Flame, Check, X, Snowflake, Calendar, ChevronLeft, ChevronRight } from "lucide-react-native";
import Svg, { Circle } from "react-native-svg";
import * as Haptics from "expo-haptics";

import { Text } from "@/components/ScaledText";
import { useAdminPastel } from "@/components/admin/AdminUI";
import { useStreakStore, type WeekDay, type MonthDay } from "@/lib/streakStore";
import { fonts, colors } from "@/constants/theme";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_WIDTH = Math.min(SCREEN_WIDTH - 48, 360);
const RING_SIZE = 140;
const RING_STROKE = 4;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

interface StreakModalProps {
  visible: boolean;
  onClose: () => void;
  firstName: string;
}

export const StreakModal = React.memo(function StreakModal({
  visible,
  onClose,
  firstName,
}: StreakModalProps) {
  const p = useAdminPastel();
  const isDark = useColorScheme() === "dark";
  const reduceMotion = useReducedMotion();
  const store = useStreakStore();

  const [calendarView, setCalendarView] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => new Date().toISOString().slice(0, 7));

  const weekDays = store.getWeekDays();
  const monthGrid = store.getMonthGrid(calendarMonth);
  const streakWeeks = Math.max(1, Math.floor(store.currentStreak / 7));
  const streakDays = store.currentStreak;
  const displayStreak = streakDays >= 7 ? streakWeeks : streakDays;
  const streakLabel = streakDays >= 7 ? "Week Streak" : "Day Streak";

  const flameScale = useSharedValue(1);

  useEffect(() => {
    if (visible && !reduceMotion) {
      flameScale.value = withDelay(
        400,
        withRepeat(
          withSequence(
            withTiming(1.08, { duration: 1200 }),
            withTiming(1, { duration: 1200 }),
          ),
          -1,
          true,
        ),
      );
    }
  }, [visible, reduceMotion]);

  const flameStyle = useAnimatedStyle(() => ({
    transform: [{ scale: flameScale.value }],
  }));

  const handleClose = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    store.markShown();
    onClose();
  }, [onClose, store]);

  const prevMonth = useCallback(() => {
    const [y, m] = calendarMonth.split("-").map(Number);
    const d = new Date(Date.UTC(y, m - 2, 1));
    setCalendarMonth(d.toISOString().slice(0, 7));
  }, [calendarMonth]);

  const nextMonth = useCallback(() => {
    const [y, m] = calendarMonth.split("-").map(Number);
    const d = new Date(Date.UTC(y, m, 1));
    const next = d.toISOString().slice(0, 7);
    if (next <= new Date().toISOString().slice(0, 7)) {
      setCalendarMonth(next);
    }
  }, [calendarMonth]);

  const cardBg = isDark ? "#1A201A" : "#FFFFFF";
  const statsBg = isDark ? "#141C14" : "#F8FAF7";
  const accent = p.accent;
  const accentSoft = isDark ? "rgba(158,247,0,0.15)" : "rgba(47,159,61,0.12)";
  const ringTrack = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)";

  const monthLabel = new Date(calendarMonth + "-15").toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
  const isCurrentMonth = calendarMonth === new Date().toISOString().slice(0, 7);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <Animated.View
        entering={reduceMotion ? undefined : FadeIn.duration(250)}
        style={styles.overlay}
      >
        <BlurView intensity={isDark ? 40 : 30} tint={isDark ? "dark" : "light"} style={StyleSheet.absoluteFill} />
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />

        <Animated.View
          entering={reduceMotion ? undefined : FadeInUp.delay(100).duration(400).springify().damping(18)}
          style={[styles.card, { backgroundColor: cardBg, width: CARD_WIDTH }]}
        >
          {/* Close button */}
          <Pressable style={styles.closeBtn} onPress={handleClose} hitSlop={12}>
            <X size={20} color={p.textMuted} />
          </Pressable>

          {/* Calendar toggle */}
          <Pressable
            style={styles.calendarToggle}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setCalendarView((v) => !v);
            }}
            hitSlop={8}
          >
            <Calendar size={18} color={calendarView ? accent : p.textMuted} />
          </Pressable>

          {/* Fire icon with ring */}
          <Animated.View
            entering={reduceMotion ? undefined : FadeInDown.delay(200).duration(400)}
            style={styles.fireContainer}
          >
            <Svg width={RING_SIZE} height={RING_SIZE} style={styles.ring}>
              <Circle
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                r={RING_RADIUS}
                stroke={ringTrack}
                strokeWidth={RING_STROKE}
                fill="none"
              />
              <Circle
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                r={RING_RADIUS}
                stroke={accent}
                strokeWidth={RING_STROKE}
                fill="none"
                strokeDasharray={RING_CIRCUMFERENCE}
                strokeDashoffset={RING_CIRCUMFERENCE * 0.25}
                strokeLinecap="round"
                rotation="-90"
                origin={`${RING_SIZE / 2}, ${RING_SIZE / 2}`}
                opacity={0.3}
              />
            </Svg>
            <Animated.View style={[styles.fireIconWrap, flameStyle]}>
              <View style={[styles.fireGlow, { backgroundColor: accentSoft }]} />
              <Flame size={52} color={accent} fill={accent} strokeWidth={1.5} />
            </Animated.View>
            <Text style={[styles.streakNumber, { color: p.textPrimary }]}>
              {displayStreak}
            </Text>
          </Animated.View>

          {/* Streak label */}
          <Animated.View
            entering={reduceMotion ? undefined : FadeInDown.delay(300).duration(350)}
            style={styles.labelContainer}
          >
            <Text style={[styles.streakTitle, { color: p.textPrimary }]}>
              {streakLabel}
            </Text>
            <Text style={[styles.streakSubtitle, { color: p.textMuted }]}>
              You are doing really great, {firstName}!
            </Text>
            {store.freezesAvailable > 0 && (
              <View style={styles.freezeRow}>
                <Snowflake size={13} color={colors.streakFreeze} />
                <Text style={[styles.freezeText, { color: colors.streakFreeze }]}>
                  {store.freezesAvailable} freeze{store.freezesAvailable > 1 ? "s" : ""} available
                </Text>
              </View>
            )}
          </Animated.View>

          {/* Week or Month view */}
          {calendarView ? (
            <Animated.View
              entering={reduceMotion ? undefined : FadeInDown.delay(400).duration(350)}
              style={styles.calendarContainer}
            >
              <View style={styles.calendarNav}>
                <Pressable onPress={prevMonth} hitSlop={8}>
                  <ChevronLeft size={20} color={p.textMuted} />
                </Pressable>
                <Text style={[styles.monthLabel, { color: p.textPrimary }]}>{monthLabel}</Text>
                <Pressable onPress={nextMonth} hitSlop={8} style={{ opacity: isCurrentMonth ? 0.3 : 1 }}>
                  <ChevronRight size={20} color={p.textMuted} />
                </Pressable>
              </View>
              <View style={styles.calendarHeaderRow}>
                {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((l) => (
                  <Text key={l} style={[styles.calHeaderLabel, { color: p.textMuted }]}>{l}</Text>
                ))}
              </View>
              {monthGrid.map((week, wi) => (
                <View key={wi} style={styles.calendarRow}>
                  {week.map((day, di) => (
                    <MonthDayItem
                      key={di}
                      day={day}
                      accent={accent}
                      accentSoft={accentSoft}
                      textPrimary={p.textPrimary}
                      textMuted={p.textMuted}
                    />
                  ))}
                </View>
              ))}
            </Animated.View>
          ) : (
            <Animated.View
              entering={reduceMotion ? undefined : FadeInDown.delay(400).duration(350)}
              style={styles.weekRow}
            >
              {weekDays.map((day, i) => (
                <WeekDayItem
                  key={i}
                  day={day}
                  accent={accent}
                  accentSoft={accentSoft}
                  textPrimary={p.textPrimary}
                  textMuted={p.textMuted}
                  delay={450 + i * 50}
                  reduceMotion={reduceMotion}
                />
              ))}
            </Animated.View>
          )}

          {/* Your Stats */}
          <Animated.View
            entering={reduceMotion ? undefined : FadeInDown.delay(600).duration(350)}
            style={[styles.statsCard, { backgroundColor: statsBg }]}
          >
            <Text style={[styles.statsTitle, { color: p.textSecondary }]}>
              Your Stats
            </Text>
            <View style={styles.statsRow}>
              <StatItem label="Days" value={store.totalDays} textPrimary={p.textPrimary} textMuted={p.textMuted} />
              <StatItem label="Sessions" value={store.totalSessions} textPrimary={p.textPrimary} textMuted={p.textMuted} />
              <StatItem label="Minutes" value={store.totalMinutes} textPrimary={p.textPrimary} textMuted={p.textMuted} />
            </View>
          </Animated.View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
});

const WeekDayItem = React.memo(function WeekDayItem({
  day,
  accent,
  accentSoft,
  textPrimary,
  textMuted,
  delay,
  reduceMotion,
}: {
  day: WeekDay;
  accent: string;
  accentSoft: string;
  textPrimary: string;
  textMuted: string;
  delay: number;
  reduceMotion: boolean | null;
}) {
  const scale = useSharedValue(0);
  useEffect(() => {
    if ((day.completed || day.frozen) && !reduceMotion) {
      scale.value = withDelay(delay, withSpring(1, { damping: 12, stiffness: 200 }));
    } else {
      scale.value = 1;
    }
  }, [day.completed, day.frozen, reduceMotion, delay]);
  const checkStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <View style={styles.weekDayItem}>
      <Text
        style={[
          styles.weekDayLabel,
          { color: day.isToday ? textPrimary : textMuted },
          day.isToday && { fontFamily: fonts.labelBold },
        ]}
      >
        {day.label}
      </Text>
      {day.completed ? (
        <Animated.View style={[styles.weekDayCircle, { backgroundColor: accent }, checkStyle]}>
          <Check size={14} color="#FFFFFF" strokeWidth={3} />
        </Animated.View>
      ) : day.frozen ? (
        <Animated.View style={[styles.weekDayCircle, { backgroundColor: colors.streakFreeze + "33" }, checkStyle]}>
          <Snowflake size={13} color={colors.streakFreeze} strokeWidth={2} />
        </Animated.View>
      ) : (
        <View
          style={[
            styles.weekDayCircle,
            {
              backgroundColor: day.isFuture ? "transparent" : accentSoft,
              borderWidth: day.isToday ? 1.5 : 0,
              borderColor: day.isToday ? accent : "transparent",
            },
          ]}
        >
          <Text
            style={[
              styles.weekDayDate,
              {
                color: day.isFuture ? textMuted : textPrimary,
                opacity: day.isFuture ? 0.5 : 1,
              },
            ]}
          >
            {day.date}
          </Text>
        </View>
      )}
    </View>
  );
});

const MonthDayItem = React.memo(function MonthDayItem({
  day,
  accent,
  accentSoft,
  textPrimary,
  textMuted,
}: {
  day: MonthDay;
  accent: string;
  accentSoft: string;
  textPrimary: string;
  textMuted: string;
}) {
  if (day.isEmpty) {
    return <View style={styles.calDayCell} />;
  }
  return (
    <View style={styles.calDayCell}>
      <View
        style={[
          styles.calDayCircle,
          day.completed && { backgroundColor: accent },
          day.frozen && !day.completed && { backgroundColor: colors.streakFreeze + "33" },
          day.isToday && !day.completed && !day.frozen && { borderWidth: 1.5, borderColor: accent },
        ]}
      >
        {day.completed ? (
          <Check size={11} color="#FFFFFF" strokeWidth={3} />
        ) : day.frozen ? (
          <Snowflake size={11} color={colors.streakFreeze} strokeWidth={2} />
        ) : (
          <Text
            style={[
              styles.calDayText,
              {
                color: day.isFuture ? textMuted : textPrimary,
                opacity: day.isFuture ? 0.4 : 1,
                fontFamily: day.isToday ? fonts.labelBold : fonts.bodyRegular,
              },
            ]}
          >
            {day.date}
          </Text>
        )}
      </View>
    </View>
  );
});

const StatItem = React.memo(function StatItem({
  label,
  value,
  textPrimary,
  textMuted,
}: {
  label: string;
  value: number;
  textPrimary: string;
  textMuted: string;
}) {
  return (
    <View style={styles.statItem}>
      <Text style={[styles.statLabel, { color: textMuted }]}>{label}</Text>
      <Text style={[styles.statValue, { color: textPrimary }]}>{value}</Text>
    </View>
  );
});

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    borderRadius: 28,
    paddingTop: 40,
    paddingBottom: 28,
    paddingHorizontal: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
  },
  closeBtn: {
    position: "absolute",
    top: 16,
    right: 16,
    zIndex: 10,
    padding: 4,
  },
  calendarToggle: {
    position: "absolute",
    top: 16,
    left: 16,
    zIndex: 10,
    padding: 4,
  },
  fireContainer: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  ring: {
    position: "absolute",
  },
  fireIconWrap: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: -8,
  },
  fireGlow: {
    position: "absolute",
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  streakNumber: {
    fontFamily: fonts.heroNumber,
    fontSize: 38,
    letterSpacing: -1,
    marginTop: -18,
  },
  labelContainer: {
    alignItems: "center",
    marginTop: 4,
    gap: 4,
  },
  streakTitle: {
    fontFamily: fonts.heading1,
    fontSize: 22,
    letterSpacing: -0.3,
  },
  streakSubtitle: {
    fontFamily: fonts.bodyRegular,
    fontSize: 14,
  },
  freezeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 4,
  },
  freezeText: {
    fontFamily: fonts.labelMedium,
    fontSize: 12,
  },
  // Week view
  weekRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
    marginTop: 24,
    paddingHorizontal: 8,
  },
  weekDayItem: {
    alignItems: "center",
    gap: 8,
  },
  weekDayLabel: {
    fontFamily: fonts.labelMedium,
    fontSize: 13,
  },
  weekDayCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  weekDayDate: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
  },
  // Calendar view
  calendarContainer: {
    width: "100%",
    marginTop: 20,
  },
  calendarNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  monthLabel: {
    fontFamily: fonts.labelBold,
    fontSize: 14,
  },
  calendarHeaderRow: {
    flexDirection: "row",
    marginBottom: 4,
  },
  calHeaderLabel: {
    flex: 1,
    textAlign: "center",
    fontFamily: fonts.labelMedium,
    fontSize: 11,
  },
  calendarRow: {
    flexDirection: "row",
    marginBottom: 2,
  },
  calDayCell: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 2,
  },
  calDayCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  calDayText: {
    fontSize: 11,
  },
  // Stats
  statsCard: {
    width: "100%",
    borderRadius: 16,
    padding: 16,
    marginTop: 24,
    alignItems: "center",
  },
  statsTitle: {
    fontFamily: fonts.labelBold,
    fontSize: 13,
    letterSpacing: 0.3,
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
  },
  statItem: {
    alignItems: "center",
    gap: 2,
  },
  statLabel: {
    fontFamily: fonts.labelMedium,
    fontSize: 12,
  },
  statValue: {
    fontFamily: fonts.statNumber,
    fontSize: 26,
    letterSpacing: -0.5,
  },
});
