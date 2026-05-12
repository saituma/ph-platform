import React, { useCallback, useEffect } from "react";
import {
  Dimensions,
  Modal,
  Pressable,
  Share,
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
import { Flame, X } from "lucide-react-native";
import Svg, { Circle } from "react-native-svg";
import * as Haptics from "expo-haptics";

import { Text } from "@/components/ScaledText";
import { useAdminPastel } from "@/components/admin/AdminUI";
import { fonts, colors } from "@/constants/theme";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_WIDTH = Math.min(SCREEN_WIDTH - 48, 360);
const RING_SIZE = 160;
const RING_STROKE = 5;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
const PARTICLE_COUNT = 16;

interface StreakMilestoneModalProps {
  visible: boolean;
  onClose: () => void;
  milestoneDay: number;
  firstName: string;
}

function getMilestoneHeadline(day: number): string {
  switch (day) {
    case 3: return "3 days strong!";
    case 7: return "One week!";
    case 14: return "Two weeks in!";
    case 30: return "30-day legend";
    case 100: return "100 days. Unstoppable.";
    case 365: return "One full year!";
    default: return `${day}-day streak!`;
  }
}

function getMilestoneSubtitle(day: number, firstName: string): string {
  switch (day) {
    case 3: return `${firstName}, you're building a habit!`;
    case 7: return `A full week of consistency, ${firstName}.`;
    case 14: return `Two weeks solid. Keep going!`;
    case 30: return `A whole month, ${firstName}. You're elite.`;
    case 100: return `100 days. You've changed your life.`;
    case 365: return `365 days, ${firstName}. Absolute legend.`;
    default: return `Keep the fire burning, ${firstName}!`;
  }
}

interface Particle {
  angle: number;
  color: string;
  size: number;
  distance: number;
}

const PARTICLE_COLORS = ["#FF9500", "#9EF700", "#5AC8FA", "#FF6B6B", "#FFB020", "#7B61FF"];

const PARTICLES: Particle[] = Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
  angle: (i / PARTICLE_COUNT) * 2 * Math.PI,
  color: PARTICLE_COLORS[i % PARTICLE_COLORS.length],
  size: 6 + (i % 3) * 3,
  distance: 80 + (i % 4) * 20,
}));

function ParticleView({
  particle,
  visible,
  delay,
  reduceMotion,
}: {
  particle: Particle;
  visible: boolean;
  delay: number;
  reduceMotion: boolean | null;
}) {
  const progress = useSharedValue(0);

  useEffect(() => {
    if (visible && !reduceMotion) {
      progress.value = 0;
      progress.value = withDelay(
        delay,
        withSpring(1, { damping: 14, stiffness: 120, mass: 0.6 }),
      );
    } else {
      progress.value = 0;
    }
  }, [visible, reduceMotion, delay]);

  const style = useAnimatedStyle(() => {
    const x = Math.cos(particle.angle) * particle.distance * progress.value;
    const y = Math.sin(particle.angle) * particle.distance * progress.value;
    return {
      transform: [{ translateX: x }, { translateY: y }],
      opacity: progress.value > 0.1 ? 1 - progress.value * 0.3 : 0,
    };
  });

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          width: particle.size,
          height: particle.size,
          borderRadius: particle.size / 2,
          backgroundColor: particle.color,
        },
        style,
      ]}
    />
  );
}

export const StreakMilestoneModal = React.memo(function StreakMilestoneModal({
  visible,
  onClose,
  milestoneDay,
  firstName,
}: StreakMilestoneModalProps) {
  const p = useAdminPastel();
  const isDark = useColorScheme() === "dark";
  const reduceMotion = useReducedMotion();

  const flameScale = useSharedValue(1);

  useEffect(() => {
    if (visible) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 150);
      setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 300);

      if (!reduceMotion) {
        flameScale.value = withDelay(
          300,
          withRepeat(
            withSequence(
              withTiming(1.12, { duration: 900 }),
              withTiming(1, { duration: 900 }),
            ),
            -1,
            true,
          ),
        );
      }
    }
  }, [visible, reduceMotion]);

  const flameStyle = useAnimatedStyle(() => ({
    transform: [{ scale: flameScale.value }],
  }));

  const handleClose = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  }, [onClose]);

  const handleShare = useCallback(async () => {
    try {
      await Share.share({
        message: `I just hit a ${milestoneDay}-day streak on PH Performance! ${getMilestoneHeadline(milestoneDay)} 🔥`,
      });
    } catch {
      // ignore
    }
  }, [milestoneDay]);

  const cardBg = isDark ? "#1A201A" : "#FFFFFF";
  const statsBg = isDark ? "#141C14" : "#F8FAF7";
  const accent = p.accent;
  const accentSoft = isDark ? "rgba(158,247,0,0.15)" : "rgba(47,159,61,0.12)";
  const ringTrack = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)";

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
        <BlurView intensity={isDark ? 50 : 40} tint={isDark ? "dark" : "light"} style={StyleSheet.absoluteFill} />
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />

        <Animated.View
          entering={reduceMotion ? undefined : FadeInUp.delay(80).duration(400).springify().damping(18)}
          style={[styles.card, { backgroundColor: cardBg, width: CARD_WIDTH }]}
        >
          <Pressable style={styles.closeBtn} onPress={handleClose} hitSlop={12}>
            <X size={20} color={p.textMuted} />
          </Pressable>

          {/* Flame with ring + particles */}
          <Animated.View
            entering={reduceMotion ? undefined : FadeInDown.delay(180).duration(400)}
            style={styles.fireContainer}
          >
            {/* Particles */}
            <View style={styles.particleContainer} pointerEvents="none">
              {PARTICLES.map((particle, i) => (
                <ParticleView
                  key={i}
                  particle={particle}
                  visible={visible}
                  delay={100 + i * 20}
                  reduceMotion={reduceMotion}
                />
              ))}
            </View>

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
                stroke={colors.streakFlame}
                strokeWidth={RING_STROKE}
                fill="none"
                strokeLinecap="round"
              />
            </Svg>

            <Animated.View style={[styles.fireIconWrap, flameStyle]}>
              <View style={[styles.fireGlow, { backgroundColor: "rgba(255,149,0,0.2)" }]} />
              <Flame size={72} color={colors.streakFlame} fill={colors.streakFlame} strokeWidth={1.5} />
            </Animated.View>
            <Text style={[styles.streakNumber, { color: p.textPrimary }]}>
              {milestoneDay}
            </Text>
          </Animated.View>

          {/* Headline */}
          <Animated.View
            entering={reduceMotion ? undefined : FadeInDown.delay(280).duration(350)}
            style={styles.labelContainer}
          >
            <Text style={[styles.headline, { color: p.textPrimary }]}>
              {getMilestoneHeadline(milestoneDay)}
            </Text>
            <Text style={[styles.subtitle, { color: p.textMuted }]}>
              {getMilestoneSubtitle(milestoneDay, firstName)}
            </Text>
          </Animated.View>

          {/* Badge */}
          <Animated.View
            entering={reduceMotion ? undefined : FadeInDown.delay(380).duration(350)}
            style={[styles.badgeRow, { backgroundColor: statsBg }]}
          >
            <Flame size={16} color={colors.streakFlame} fill={colors.streakFlame} />
            <Text style={[styles.badgeText, { color: p.textPrimary }]}>
              {milestoneDay}-Day Milestone
            </Text>
          </Animated.View>

          {/* Share button */}
          <Animated.View
            entering={reduceMotion ? undefined : FadeInDown.delay(460).duration(350)}
            style={styles.btnRow}
          >
            <Pressable
              onPress={handleShare}
              style={({ pressed }) => [
                styles.shareBtn,
                { backgroundColor: accentSoft, borderColor: accent, opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <Text style={[styles.shareBtnText, { color: accent }]}>Share streak</Text>
            </Pressable>
            <Pressable
              onPress={handleClose}
              style={({ pressed }) => [
                styles.doneBtn,
                { backgroundColor: accent, opacity: pressed ? 0.8 : 1 },
              ]}
            >
              <Text style={styles.doneBtnText}>Done</Text>
            </Pressable>
          </Animated.View>
        </Animated.View>
      </Animated.View>
    </Modal>
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
    paddingTop: 44,
    paddingBottom: 28,
    paddingHorizontal: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.2,
    shadowRadius: 32,
    elevation: 16,
  },
  closeBtn: {
    position: "absolute",
    top: 16,
    right: 16,
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
  particleContainer: {
    position: "absolute",
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: "center",
    justifyContent: "center",
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
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  streakNumber: {
    fontFamily: fonts.heroNumber,
    fontSize: 44,
    letterSpacing: -1,
    marginTop: -20,
  },
  labelContainer: {
    alignItems: "center",
    marginTop: 4,
    gap: 6,
  },
  headline: {
    fontFamily: fonts.heroDisplay,
    fontSize: 26,
    letterSpacing: -0.5,
    textAlign: "center",
  },
  subtitle: {
    fontFamily: fonts.bodyRegular,
    fontSize: 14,
    textAlign: "center",
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 100,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginTop: 20,
  },
  badgeText: {
    fontFamily: fonts.labelBold,
    fontSize: 13,
  },
  btnRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 24,
    width: "100%",
  },
  shareBtn: {
    flex: 1,
    height: 48,
    borderRadius: 100,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  shareBtnText: {
    fontFamily: fonts.labelBold,
    fontSize: 15,
  },
  doneBtn: {
    flex: 1,
    height: 48,
    borderRadius: 100,
    alignItems: "center",
    justifyContent: "center",
  },
  doneBtnText: {
    fontFamily: fonts.labelBold,
    fontSize: 15,
    color: "#000000",
  },
});
