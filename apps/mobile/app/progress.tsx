import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Pressable,
  ScrollView,
  TextInput,
  Platform,
  KeyboardAvoidingView,
  Switch,
  Alert,
  StyleSheet,
  Keyboard,
  Dimensions,
  RefreshControl,
  useColorScheme,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import * as Haptics from "expo-haptics";
import DateTimePicker from "@react-native-community/datetimepicker";
import {
  ArrowLeft,
  BarChart3,
  Calendar,
  Clock,
  Dumbbell,
  Plus,
  Ruler,
  Scale,
  Trash2,
  TrendingUp,
  Target,
  Activity,
  ChevronRight,
} from "lucide-react-native";
import Animated, {
  FadeInDown,
  FadeIn,
  useSharedValue,
  useAnimatedStyle,
  useAnimatedProps,
  withTiming,
  withDelay,
  withSpring,
  withSequence,
  Easing,
  runOnJS,
  useAnimatedReaction,
  interpolateColor,
  useReducedMotion,
} from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";
import { useRouter } from "expo-router";
import { useAdminPastel } from "@/components/admin/AdminUI";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { Text } from "@/components/ScaledText";
import { fonts } from "@/constants/theme";
import {
  initProgressDb,
  insertStrength,
  insertBodyWeight,
  insertMeasurement,
  listStrength,
  listBodyWeights,
  listMeasurements,
  deleteStrength,
  deleteBodyWeight,
  deleteMeasurement,
  type StrengthEntry,
  type BodyWeightEntry,
  type MeasurementEntry,
  type MeasurementKind,
} from "@/lib/sqliteProgress";
import {
  getProgressReminderPrefs,
  setProgressReminderPrefs,
} from "@/lib/progressPreferences";
import {
  requestProgressNotificationPermission,
  syncProgressWeeklyReminder,
} from "@/lib/progressReminders";
import { AdaptiveSheet } from "@/components/native/AdaptiveSheet";
import { useAppToast } from "@/hooks/useAppToast";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const { width: _SCREEN_W } = Dimensions.get("window");
const SCREEN_W = Platform.isPad ? Math.min(_SCREEN_W, 560) : _SCREEN_W;
const RING_SIZE = Math.min(SCREEN_W - 100, 200);
const BENTO_GAP = 10;
const BENTO_HALF = (SCREEN_W - 48 - BENTO_GAP) / 2;

type Tab = "strength" | "weight" | "measure";

const MEASURE_PRESETS: { kind: MeasurementKind; label: string }[] = [
  { kind: "chest", label: "Chest" },
  { kind: "waist", label: "Waist" },
  { kind: "hips", label: "Hips" },
  { kind: "arm", label: "Arm" },
  { kind: "thigh", label: "Thigh" },
  { kind: "calf", label: "Calf" },
  { kind: "neck", label: "Neck" },
  { kind: "other", label: "Custom" },
];

function parseIsoToLocalDate(iso: string): Date {
  const parts = iso.split("-").map((pt) => parseInt(pt, 10));
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) return new Date();
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

function formatIsoToDisplay(iso: string): string {
  return parseIsoToLocalDate(iso).toLocaleDateString(undefined, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function dateToIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function relativeDate(iso: string): string {
  const d = parseIsoToLocalDate(iso);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const diff = Math.round((now.getTime() - d.getTime()) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff < 7) return `${diff}d ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

// ── Animated progress ring ──
function ProgressRing({
  size,
  strokeWidth,
  progress,
  color,
  trackColor,
  centerText,
  centerSubtext,
  textColor,
  subtextColor,
  animate,
}: {
  size: number;
  strokeWidth: number;
  progress: number;
  color: string;
  trackColor: string;
  centerText: string;
  centerSubtext: string;
  textColor: string;
  subtextColor: string;
  animate: boolean;
}) {
  const center = size / 2;
  const radius = size / 2 - strokeWidth;
  const circumference = 2 * Math.PI * radius;
  const animProgress = useSharedValue(0);
  const scale = useSharedValue(animate ? 0.85 : 1);
  const opacity = useSharedValue(animate ? 0 : 1);

  useEffect(() => {
    if (animate) {
      animProgress.value = 0;
      animProgress.value = withDelay(
        400,
        withTiming(Math.min(1, Math.max(0, progress)), { duration: 1200, easing: Easing.out(Easing.cubic) }),
      );
      scale.value = withDelay(200, withTiming(1, { duration: 600, easing: Easing.out(Easing.back(1.2)) }));
      opacity.value = withDelay(200, withTiming(1, { duration: 400 }));
    } else {
      animProgress.value = progress;
    }
  }, [progress, animate]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - animProgress.value),
  }));

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[{ width: size, height: size, alignItems: "center", justifyContent: "center" }, containerStyle]}>
      <Svg width={size} height={size}>
        <Circle cx={center} cy={center} r={radius} stroke={trackColor} strokeWidth={strokeWidth} fill="none" />
        <AnimatedCircle
          cx={center}
          cy={center}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          animatedProps={animatedProps}
          strokeLinecap="round"
          rotation={-90}
          origin={`${center}, ${center}`}
        />
      </Svg>
      <View style={{ position: "absolute", alignItems: "center" }}>
        <Text style={{ fontFamily: fonts.heroNumber, fontSize: 38, color: textColor, letterSpacing: -1.5 }}>
          {centerText}
        </Text>
        <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 13, color: subtextColor, marginTop: -2 }}>
          {centerSubtext}
        </Text>
      </View>
    </Animated.View>
  );
}

// ── Counting number with animation ──
function CountingNumber({
  value,
  decimals = 0,
  style,
  suffix,
  suffixStyle,
}: {
  value: number;
  decimals?: number;
  style: any;
  suffix?: string;
  suffixStyle?: any;
}) {
  const [display, setDisplay] = useState(decimals > 0 ? "0.0" : "0");
  const anim = useSharedValue(0);

  useEffect(() => {
    anim.value = 0;
    anim.value = withDelay(300, withTiming(value, { duration: 1200, easing: Easing.out(Easing.cubic) }));
  }, [value]);

  useAnimatedReaction(
    () => anim.value,
    (v) => runOnJS(setDisplay)(v.toFixed(decimals)),
    [anim],
  );

  return (
    <Text style={style}>
      {value > 0 ? display : "—"}
      {suffix ? <Text style={suffixStyle}>{suffix}</Text> : null}
    </Text>
  );
}

// ── Scale-bounce pressable ──
function ScalePressable({
  children,
  onPress,
  style,
  activeScale = 0.96,
}: {
  children: React.ReactNode;
  onPress?: () => void;
  style?: any;
  activeScale?: number;
}) {
  const s = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => { s.value = withSpring(activeScale, { damping: 15, stiffness: 300 }); }}
      onPressOut={() => { s.value = withSpring(1, { damping: 12, stiffness: 200 }); }}
    >
      <Animated.View style={[style, animStyle]}>{children}</Animated.View>
    </Pressable>
  );
}

// ── Animated bar ──
function AnimatedBar({
  percentage,
  color,
  delay: barDelay,
  height = 14,
  trackColor,
}: {
  percentage: number;
  color: string;
  delay: number;
  height?: number;
  trackColor: string;
}) {
  const w = useSharedValue(0);

  useEffect(() => {
    w.value = 0;
    w.value = withDelay(barDelay, withTiming(Math.min(100, percentage), { duration: 800, easing: Easing.out(Easing.cubic) }));
  }, [percentage, barDelay]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${w.value}%`,
    height,
    borderRadius: height / 2,
    backgroundColor: color,
  }));

  return (
    <View style={{ height, borderRadius: height / 2, backgroundColor: trackColor, overflow: "hidden" }}>
      <Animated.View style={fillStyle} />
    </View>
  );
}

// ── Bento stat card ──
function BentoStat({
  icon,
  iconBg,
  label,
  value,
  unit,
  cardBg,
  textColor,
  subtextColor,
  delay: d,
  wide,
}: {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  value: string;
  unit?: string;
  cardBg: string;
  textColor: string;
  subtextColor: string;
  delay: number;
  wide?: boolean;
}) {
  return (
    <ScalePressable activeScale={0.97}>
      <Animated.View
        entering={FadeInDown.delay(d).duration(350).springify().damping(18)}
        style={{
          backgroundColor: cardBg,
          borderRadius: 22,
          padding: 16,
          width: wide ? undefined : BENTO_HALF,
          flex: wide ? 1 : undefined,
          minHeight: 100,
        }}
      >
        <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: iconBg, alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
          {icon}
        </View>
        <Text style={{ fontFamily: fonts.labelMedium, fontSize: 12, color: subtextColor, marginBottom: 4 }}>
          {label}
        </Text>
        <Text style={{ fontFamily: fonts.heroNumber, fontSize: 28, color: textColor, letterSpacing: -1 }}>
          {value}
          {unit ? <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 16, color: subtextColor }}> {unit}</Text> : null}
        </Text>
      </Animated.View>
    </ScalePressable>
  );
}

// ── Filter pill ──
function FilterPill({
  label,
  isActive,
  onPress,
  activeColor,
  inactiveColor,
  activeTextColor,
  inactiveTextColor,
}: {
  label: string;
  isActive: boolean;
  onPress: () => void;
  activeColor: string;
  inactiveColor: string;
  activeTextColor: string;
  inactiveTextColor: string;
}) {
  const bg = useSharedValue(isActive ? 1 : 0);
  const sc = useSharedValue(1);

  useEffect(() => {
    bg.value = withTiming(isActive ? 1 : 0, { duration: 250 });
    if (isActive) sc.value = withSequence(withTiming(1.08, { duration: 100 }), withSpring(1, { damping: 14, stiffness: 250 }));
  }, [isActive]);

  const pillStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(bg.value, [0, 1], [inactiveColor, activeColor]),
    transform: [{ scale: sc.value }],
  }));

  return (
    <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onPress(); }}>
      <Animated.View style={[{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 100 }, pillStyle]}>
        <Animated.Text style={{ fontFamily: fonts.labelMedium, fontSize: 13, color: isActive ? activeTextColor : inactiveTextColor }}>
          {label}
        </Animated.Text>
      </Animated.View>
    </Pressable>
  );
}

export default function ProgressScreen() {
  const insets = useAppSafeAreaInsets();
  const p = useAdminPastel();
  const { isDark } = useAppTheme();
  const reduceMotion = useReducedMotion();
  const toast = useAppToast();
  const router = useRouter();

  const [tab, setTab] = useState<Tab>("strength");
  const [strength, setStrength] = useState<StrengthEntry[]>([]);
  const [weights, setWeights] = useState<BodyWeightEntry[]>([]);
  const [measures, setMeasures] = useState<MeasurementEntry[]>([]);

  const [reminderOn, setReminderOn] = useState(true);
  const [reminderTime, setReminderTime] = useState(new Date());
  const [showTimePick, setShowTimePick] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [showEntryDatePick, setShowEntryDatePick] = useState(false);
  const [dateIso, setDateIso] = useState(() => new Date().toISOString().slice(0, 10));

  const [exName, setExName] = useState("");
  const [liftKg, setLiftKg] = useState("");
  const [reps, setReps] = useState("");
  const [sets, setSets] = useState("");
  const [bwKg, setBwKg] = useState("");
  const [measCm, setMeasCm] = useState("");
  const [measKind, setMeasKind] = useState<MeasurementKind>("waist");
  const [measLabel, setMeasLabel] = useState("");
  const [notes, setNotes] = useState("");

  const load = useCallback(() => {
    initProgressDb();
    setStrength(listStrength(40));
    setWeights(listBodyWeights(60));
    setMeasures(listMeasurements(40));
  }, []);

  useEffect(() => {
    load();
    void (async () => {
      const prefs = await getProgressReminderPrefs();
      setReminderOn(prefs.enabled);
      const d = new Date();
      d.setHours(prefs.hour, prefs.minute, 0, 0);
      setReminderTime(d);
    })();
  }, [load]);

  // ── Computed stats ──
  const latestWeight = weights[0]?.weight_kg ?? 0;
  const prevWeight = weights[1]?.weight_kg ?? 0;
  const weightDelta = latestWeight && prevWeight ? latestWeight - prevWeight : 0;

  const bestLift = useMemo(() => {
    if (strength.length === 0) return null;
    return strength.reduce((best, s) => (s.weight_kg > best.weight_kg ? s : best), strength[0]);
  }, [strength]);

  const totalLifts = strength.length;
  const totalWeighIns = weights.length;
  const totalMeasurements = measures.length;

  const totalEntries = totalLifts + totalWeighIns + totalMeasurements;
  const goalEntries = 30;
  const ringProgress = Math.min(1, totalEntries / goalEntries);

  const strengthSeries = useMemo(() => strength.slice(0, 14).map((s) => s.weight_kg), [strength]);
  const weightSeries = useMemo(() => weights.slice(0, 14).map((w) => w.weight_kg), [weights]);
  const measureSeries = useMemo(() => measures.slice(0, 14).map((m) => m.value_cm), [measures]);

  const activeSeries = tab === "strength" ? strengthSeries : tab === "weight" ? weightSeries : measureSeries;
  const activeMax = Math.max(...activeSeries, 1);

  const heroBg = isDark ? "#000000" : "#1A3A1F";
  const heroText = "#FFFFFF";
  const accentRing = isDark ? "#2D6A1A" : "#2F9F3D";
  const trackColor = isDark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.15)";

  const openAdd = () => {
    setDateIso(new Date().toISOString().slice(0, 10));
    setExName("");
    setLiftKg("");
    setReps("");
    setSets("");
    setBwKg("");
    setMeasCm("");
    setMeasKind("waist");
    setMeasLabel("");
    setNotes("");
    setShowEntryDatePick(false);
    setModalOpen(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const saveEntry = () => {
    try {
      if (tab === "strength") {
        const w = parseFloat(liftKg.replace(",", "."));
        if (!exName.trim() || !isFinite(w)) {
          toast.warning("Missing info", "Add exercise name and weight (kg).");
          return;
        }
        insertStrength({
          date_iso: dateIso,
          exercise_name: exName,
          weight_kg: w,
          reps: reps.trim() ? parseInt(reps, 10) : null,
          sets: sets.trim() ? parseInt(sets, 10) : null,
          notes,
        });
      } else if (tab === "weight") {
        const w = parseFloat(bwKg.replace(",", "."));
        if (!isFinite(w)) {
          toast.warning("Missing info", "Enter body weight in kg.");
          return;
        }
        insertBodyWeight({ date_iso: dateIso, weight_kg: w, notes });
      } else {
        const cm = parseFloat(measCm.replace(",", "."));
        if (!isFinite(cm)) {
          toast.warning("Missing info", "Enter measurement in cm.");
          return;
        }
        const preset = MEASURE_PRESETS.find((m) => m.kind === measKind);
        const label =
          measKind === "other" && measLabel.trim()
            ? measLabel.trim()
            : preset?.label ?? "Measurement";
        insertMeasurement({
          date_iso: dateIso,
          kind: measKind,
          label,
          value_cm: cm,
          notes,
        });
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setModalOpen(false);
      load();
    } catch (e) {
      toast.error("Could not save", e instanceof Error ? e.message : "Unknown error");
    }
  };

  const persistReminder = async (enabled: boolean, time?: Date) => {
    const t = time ?? reminderTime;
    const next = await setProgressReminderPrefs({
      enabled,
      hour: t.getHours(),
      minute: t.getMinutes(),
    });
    if (enabled) {
      const ok = await requestProgressNotificationPermission();
      if (!ok) {
        setReminderOn(false);
        await setProgressReminderPrefs({ enabled: false });
        toast.info("Notifications off", "Enable notifications in system settings to get progress reminders.");
        return;
      }
    }
    await syncProgressWeeklyReminder(next);
  };

  const TAB_META: Record<Tab, { icon: React.FC<any>; label: string; color: string }> = {
    strength: { icon: Dumbbell, label: "Strength", color: accentRing },
    weight: { icon: Scale, label: "Weight", color: p.info },
    measure: { icon: Ruler, label: "Body", color: p.warning },
  };

  const activeItems = tab === "strength" ? strength : tab === "weight" ? weights : measures;

  // CTA animation
  const ctaScale = useSharedValue(0.9);
  const ctaOpacity = useSharedValue(0);
  useEffect(() => {
    ctaScale.value = withDelay(900, withSpring(1, { damping: 12, stiffness: 180 }));
    ctaOpacity.value = withDelay(800, withTiming(1, { duration: 400 }));
  }, []);
  const ctaAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ctaScale.value }],
    opacity: ctaOpacity.value,
  }));

  return (
    <View style={{ flex: 1, backgroundColor: p.pageBg }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={false} onRefresh={load} tintColor={p.accent} />}
      >
        {/* ── Hero Card ── */}
        <Animated.View
          entering={reduceMotion ? undefined : FadeInDown.duration(500).springify().damping(18)}
          style={[s.heroCard, { backgroundColor: heroBg, paddingTop: insets.top + 16 }]}
        >
          <View style={s.heroHeader}>
            <ScalePressable onPress={() => router.back()} activeScale={0.85}>
              <View style={{ padding: 4 }}>
                <ArrowLeft size={22} color={heroText} />
              </View>
            </ScalePressable>
            <ScalePressable
              onPress={openAdd}
              activeScale={0.85}
              style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.12)", alignItems: "center", justifyContent: "center" }}
            >
              <Plus size={18} color={heroText} />
            </ScalePressable>
          </View>

          <Animated.View entering={reduceMotion ? undefined : FadeIn.delay(200).duration(400)}>
            <Text style={{ fontFamily: fonts.heading2, fontSize: 18, color: "rgba(255,255,255,0.7)", letterSpacing: -0.2 }}>
              Your Progress
            </Text>
          </Animated.View>

          <CountingNumber
            value={totalEntries}
            style={{ fontFamily: fonts.heroNumber, fontSize: 56, color: heroText, letterSpacing: -2, marginTop: -4 }}
            suffix=" logged"
            suffixStyle={{ fontFamily: fonts.bodyMedium, fontSize: 20, color: "rgba(255,255,255,0.6)" }}
          />

          <View style={{ alignItems: "center", marginVertical: 20 }}>
            <ProgressRing
              size={RING_SIZE}
              strokeWidth={12}
              progress={ringProgress}
              color={accentRing}
              trackColor={trackColor}
              centerText={`${Math.round(ringProgress * 100)}%`}
              centerSubtext={`of ${goalEntries} entries`}
              textColor={heroText}
              subtextColor="rgba(255,255,255,0.6)"
              animate={!reduceMotion}
            />
          </View>

          {/* Bento stat pills */}
          <View style={{ flexDirection: "row", justifyContent: "space-around", marginTop: 8, marginBottom: 4 }}>
            {[
              { icon: <Dumbbell size={14} color="#FFF" />, bg: accentRing, label: "Lifts", value: `${totalLifts}` },
              { icon: <Scale size={14} color="#FFF" />, bg: p.info, label: "Weigh-ins", value: `${totalWeighIns}` },
              { icon: <Ruler size={14} color="#FFF" />, bg: p.warning, label: "Measures", value: `${totalMeasurements}` },
            ].map((item, i) => (
              <Animated.View
                key={item.label}
                entering={reduceMotion ? undefined : FadeInDown.delay(600 + i * 150).duration(300).springify()}
                style={{ alignItems: "center", gap: 4 }}
              >
                <Text style={{ fontFamily: fonts.labelMedium, fontSize: 12, color: "rgba(255,255,255,0.6)" }}>{item.label}</Text>
                <Text style={{ fontFamily: fonts.statNumber, fontSize: 20, color: heroText }}>{item.value}</Text>
                <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: item.bg, alignItems: "center", justifyContent: "center" }}>
                  {item.icon}
                </View>
              </Animated.View>
            ))}
          </View>

          {/* CTA */}
          <ScalePressable onPress={openAdd} activeScale={0.95}>
            <Animated.View style={[s.ctaBtn, { backgroundColor: "rgba(255,255,255,0.15)" }, ctaAnimStyle]}>
              <Text style={{ fontFamily: fonts.labelBold, fontSize: 15, color: heroText }}>
                Log {tab === "strength" ? "a Lift" : tab === "weight" ? "Weight" : "Measurement"}
              </Text>
              <ChevronRight size={16} color={heroText} />
            </Animated.View>
          </ScalePressable>
        </Animated.View>

        <View style={{ paddingHorizontal: 20, paddingTop: 20 }}>
          {/* ── Bento stat cards ── */}
          <View style={{ flexDirection: "row", gap: BENTO_GAP, marginBottom: BENTO_GAP }}>
            <BentoStat
              icon={<TrendingUp size={16} color="#FFF" />}
              iconBg={isDark ? "#1E4A12" : accentRing}
              label="Best Lift"
              value={bestLift ? `${bestLift.weight_kg}` : "—"}
              unit={bestLift ? "kg" : undefined}
              cardBg={isDark ? "#000000" : "#ECFCCB"}
              textColor={isDark ? p.textPrimary : "#166534"}
              subtextColor={isDark ? p.textSecondary : "#2F9F3D"}
              delay={100}
            />
            <BentoStat
              icon={<Scale size={16} color="#FFF" />}
              iconBg={p.info}
              label="Latest Weight"
              value={latestWeight ? `${latestWeight}` : "—"}
              unit={latestWeight ? "kg" : undefined}
              cardBg={isDark ? "#0F2027" : "#E0F2FE"}
              textColor={isDark ? "#BAE6FD" : "#0C4A6E"}
              subtextColor={isDark ? "#38BDF8" : "#0284C7"}
              delay={200}
            />
          </View>

          {weightDelta !== 0 && (
            <Animated.View
              entering={FadeInDown.delay(300).duration(350).springify()}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                backgroundColor: isDark ? p.inputBg : "#F1F5F2",
                borderRadius: 16,
                padding: 14,
                marginBottom: BENTO_GAP,
              }}
            >
              <Activity size={16} color={weightDelta > 0 ? p.danger : p.accent} />
              <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 13, color: p.textPrimary, flex: 1 }}>
                {weightDelta > 0 ? "+" : ""}{weightDelta.toFixed(1)} kg since last weigh-in
              </Text>
            </Animated.View>
          )}

          {/* ── Tab selector ── */}
          <View style={{ flexDirection: "row", gap: 8, marginBottom: 16, marginTop: 8 }}>
            {(["strength", "weight", "measure"] as Tab[]).map((key) => {
              const meta = TAB_META[key];
              return (
                <FilterPill
                  key={key}
                  label={meta.label}
                  isActive={tab === key}
                  onPress={() => setTab(key)}
                  activeColor={isDark ? "#1E4A12" : "#2C2140"}
                  inactiveColor={isDark ? "#000000" : "#F1F5F2"}
                  activeTextColor={isDark ? p.accent : "#FFFFFF"}
                  inactiveTextColor={p.textMuted}
                />
              );
            })}
          </View>

          {/* ── Trend chart card ── */}
          <Animated.View
            entering={reduceMotion ? undefined : FadeInDown.delay(350).duration(400).springify().damping(18)}
            style={[s.card, { backgroundColor: isDark ? "#000000" : p.inputBg, shadowColor: p.shadow }]}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <Text style={{ fontFamily: fonts.heading3, fontSize: 16, color: p.textPrimary }}>
                {tab === "strength" ? "Lift Trend" : tab === "weight" ? "Weight Trend" : "Measurement Trend"}
              </Text>
              <BarChart3 size={18} color={TAB_META[tab].color} />
            </View>

            {activeSeries.length > 0 ? (
              <View style={{ flexDirection: "row", alignItems: "flex-end", height: 80, gap: 4 }}>
                {activeSeries.slice(0, 14).reverse().map((v, i, arr) => {
                  const h = Math.max(6, (v / activeMax) * 72);
                  const isLast = i === arr.length - 1;
                  return (
                    <Animated.View
                      key={i}
                      entering={reduceMotion ? undefined : FadeInDown.delay(400 + i * 40).duration(300)}
                      style={{
                        flex: 1,
                        height: h,
                        borderRadius: 6,
                        backgroundColor: isLast ? (isDark ? "#2D6A1A" : TAB_META[tab].color) : (isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"),
                      }}
                    />
                  );
                })}
              </View>
            ) : (
              <View style={{ height: 80, justifyContent: "center", alignItems: "center" }}>
                <Text style={{ fontFamily: fonts.bodyRegular, color: p.textMuted, fontSize: 13 }}>
                  Add entries to see your trend
                </Text>
              </View>
            )}
          </Animated.View>

          {/* ── Recent entries card ── */}
          <Animated.View
            entering={reduceMotion ? undefined : FadeInDown.delay(450).duration(400).springify().damping(18)}
            style={[s.card, { backgroundColor: isDark ? "#000000" : p.inputBg, shadowColor: p.shadow }]}
          >
            <Text style={{ fontFamily: fonts.heading3, fontSize: 16, color: p.textPrimary, marginBottom: 14 }}>
              Recent
            </Text>

            {activeItems.length === 0 ? (
              <View style={{ paddingVertical: 24, alignItems: "center" }}>
                <Target size={32} color={p.textMuted} />
                <Text style={{ fontFamily: fonts.bodyRegular, color: p.textMuted, fontSize: 13, marginTop: 8 }}>
                  No entries yet — tap + to start
                </Text>
              </View>
            ) : null}

            {tab === "strength" &&
              strength.slice(0, 10).map((entry, i) => (
                <Animated.View
                  key={entry.id}
                  entering={reduceMotion ? undefined : FadeInDown.delay(500 + i * 60).duration(250)}
                  style={[s.entryRow, i < Math.min(strength.length, 10) - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: p.divider }]}
                >
                  <View style={[s.entryIcon, { backgroundColor: isDark ? "rgba(158,247,0,0.15)" : "#ECFCCB" }]}>
                    <Dumbbell size={16} color={accentRing} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: fonts.bodyBold, fontSize: 15, color: p.textPrimary }}>{entry.exercise_name}</Text>
                    <Text style={{ fontFamily: fonts.bodyRegular, fontSize: 12, color: p.textSecondary, marginTop: 2 }}>
                      {entry.weight_kg} kg{entry.reps != null ? ` · ${entry.reps} reps` : ""}{entry.sets != null ? ` · ${entry.sets} sets` : ""} · {relativeDate(entry.date_iso)}
                    </Text>
                  </View>
                  <Pressable
                    hitSlop={12}
                    onPress={() => {
                      Alert.alert("Delete entry?", undefined, [
                        { text: "Cancel", style: "cancel" },
                        { text: "Delete", style: "destructive", onPress: () => { deleteStrength(entry.id); load(); } },
                      ]);
                    }}
                  >
                    <Trash2 size={18} color={p.textMuted} />
                  </Pressable>
                </Animated.View>
              ))}

            {tab === "weight" &&
              weights.slice(0, 10).map((entry, i) => (
                <Animated.View
                  key={entry.id}
                  entering={reduceMotion ? undefined : FadeInDown.delay(500 + i * 60).duration(250)}
                  style={[s.entryRow, i < Math.min(weights.length, 10) - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: p.divider }]}
                >
                  <View style={[s.entryIcon, { backgroundColor: isDark ? "rgba(56,189,248,0.15)" : "#E0F2FE" }]}>
                    <Scale size={16} color={p.info} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: fonts.heroNumber, fontSize: 22, color: p.textPrimary, letterSpacing: -0.5 }}>
                      {entry.weight_kg}<Text style={{ fontFamily: fonts.bodyRegular, fontSize: 14, color: p.textSecondary }}> kg</Text>
                    </Text>
                    <Text style={{ fontFamily: fonts.bodyRegular, fontSize: 12, color: p.textSecondary }}>{relativeDate(entry.date_iso)}</Text>
                  </View>
                  <Pressable
                    hitSlop={12}
                    onPress={() => {
                      Alert.alert("Delete entry?", undefined, [
                        { text: "Cancel", style: "cancel" },
                        { text: "Delete", style: "destructive", onPress: () => { deleteBodyWeight(entry.id); load(); } },
                      ]);
                    }}
                  >
                    <Trash2 size={18} color={p.textMuted} />
                  </Pressable>
                </Animated.View>
              ))}

            {tab === "measure" &&
              measures.slice(0, 10).map((entry, i) => (
                <Animated.View
                  key={entry.id}
                  entering={reduceMotion ? undefined : FadeInDown.delay(500 + i * 60).duration(250)}
                  style={[s.entryRow, i < Math.min(measures.length, 10) - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: p.divider }]}
                >
                  <View style={[s.entryIcon, { backgroundColor: isDark ? "rgba(245,158,11,0.15)" : "#FEF3C7" }]}>
                    <Ruler size={16} color={p.warning} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontFamily: fonts.bodyBold, fontSize: 15, color: p.textPrimary }}>{entry.label}</Text>
                    <Text style={{ fontFamily: fonts.bodyRegular, fontSize: 12, color: p.textSecondary, marginTop: 2 }}>
                      {entry.value_cm} cm · {relativeDate(entry.date_iso)}
                    </Text>
                  </View>
                  <Pressable
                    hitSlop={12}
                    onPress={() => {
                      Alert.alert("Delete entry?", undefined, [
                        { text: "Cancel", style: "cancel" },
                        { text: "Delete", style: "destructive", onPress: () => { deleteMeasurement(entry.id); load(); } },
                      ]);
                    }}
                  >
                    <Trash2 size={18} color={p.textMuted} />
                  </Pressable>
                </Animated.View>
              ))}
          </Animated.View>

          {/* ── Reminder card ── */}
          <Animated.View
            entering={reduceMotion ? undefined : FadeInDown.delay(550).duration(400).springify().damping(18)}
            style={[s.card, { backgroundColor: isDark ? "#000000" : p.inputBg, shadowColor: p.shadow }]}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text style={{ fontFamily: fonts.heading3, fontSize: 16, color: p.textPrimary }}>
                  Daily reminder
                </Text>
                <Text style={{ fontFamily: fonts.bodyRegular, fontSize: 12, color: p.textSecondary, marginTop: 4 }}>
                  Gentle nudge to log progress
                </Text>
              </View>
              <Switch
                value={reminderOn}
                onValueChange={(v) => { setReminderOn(v); void persistReminder(v); }}
                trackColor={{ false: p.divider, true: p.accent }}
                thumbColor={reminderOn ? p.buttonPrimaryText : p.textMuted}
                ios_backgroundColor={p.divider}
              />
            </View>
            {reminderOn ? (
              <Pressable
                onPress={() => setShowTimePick(true)}
                style={{
                  marginTop: 14,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  alignSelf: "flex-start",
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  borderRadius: 100,
                  backgroundColor: p.accentSoft,
                }}
              >
                <Clock size={18} color={p.accent} />
                <Text style={{ fontFamily: fonts.bodyRegular, color: p.accent }}>
                  {reminderTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </Text>
              </Pressable>
            ) : null}
            {showTimePick ? (
              <DateTimePicker
                value={reminderTime}
                mode="time"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={(_, d) => {
                  setShowTimePick(Platform.OS === "ios");
                  if (d) {
                    setReminderTime(d);
                    void persistReminder(true, d);
                  }
                }}
              />
            ) : null}
          </Animated.View>
        </View>
      </ScrollView>

      {/* ── Floating add button ── */}
      <ScalePressable onPress={openAdd} activeScale={0.92}>
        <View
          style={{
            position: "absolute",
            left: 20,
            right: 20,
            bottom: insets.bottom + 16,
            height: 54,
            borderRadius: 100,
            backgroundColor: isDark ? "#1E4A12" : accentRing,
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "row",
            gap: 8,
            shadowColor: accentRing,
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.35,
            shadowRadius: 16,
            elevation: 8,
          }}
        >
          <Plus size={22} color="#FFF" />
          <Text style={{ fontFamily: fonts.labelBold, fontSize: 16, color: "#FFF" }}>Add entry</Text>
        </View>
      </ScalePressable>

      {/* ── Entry sheet ── */}
      <AdaptiveSheet
        visible={modalOpen}
        variant="bottom"
        onClose={() => { Keyboard.dismiss(); setModalOpen(false); }}
        cardStyle={{ backgroundColor: p.pageBg }}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator
          nestedScrollEnabled
          contentContainerStyle={{ paddingBottom: 28 }}
        >
          <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: p.divider, alignSelf: "center", marginBottom: 16 }} />
          <Text style={{ fontFamily: fonts.heading2, fontSize: 20, color: p.textPrimary, marginBottom: 16 }}>
            {tab === "strength" ? "Log lift" : tab === "weight" ? "Body weight" : "Measurement"}
          </Text>

          <Text style={s.fieldLabel}>DATE</Text>
          <Pressable
            onPress={() => { Keyboard.dismiss(); setShowEntryDatePick((v) => !v); }}
            style={s.dateBtn}
          >
            <Text style={{ fontFamily: fonts.bodyRegular, fontSize: 16, color: p.textPrimary }}>
              {formatIsoToDisplay(dateIso)}
            </Text>
            <Calendar size={22} color={p.accent} />
          </Pressable>
          {showEntryDatePick ? (
            <View style={{ marginBottom: 14 }}>
              <DateTimePicker
                value={parseIsoToLocalDate(dateIso)}
                mode="date"
                display={Platform.OS === "ios" ? "inline" : "default"}
                {...(Platform.OS === "ios" ? { themeVariant: isDark ? "dark" : "light" } : {})}
                onChange={(event, d) => {
                  if (Platform.OS === "android") {
                    setShowEntryDatePick(false);
                    if (event.type === "dismissed") return;
                  }
                  if (d) setDateIso(dateToIso(d));
                }}
              />
              {Platform.OS === "ios" ? (
                <Pressable onPress={() => setShowEntryDatePick(false)} style={{ alignSelf: "flex-end", marginTop: 8, paddingVertical: 8, paddingHorizontal: 12 }}>
                  <Text style={{ fontFamily: fonts.labelBold, fontSize: 16, color: p.accent }}>Done</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}

          {tab === "strength" ? (
            <>
              <Text style={s.fieldLabel}>EXERCISE</Text>
              <TextInput value={exName} onChangeText={setExName} placeholder="e.g. Back squat" placeholderTextColor={p.textMuted} style={[s.input, { color: p.textPrimary, backgroundColor: p.inputBg }]} />
              <View style={{ flexDirection: "row", gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={s.fieldLabel}>KG</Text>
                  <TextInput keyboardType="decimal-pad" value={liftKg} onChangeText={setLiftKg} placeholder="80" placeholderTextColor={p.textMuted} style={[s.input, { color: p.textPrimary, backgroundColor: p.inputBg }]} />
                </View>
                <View style={{ width: 72 }}>
                  <Text style={s.fieldLabel}>REPS</Text>
                  <TextInput keyboardType="number-pad" value={reps} onChangeText={setReps} placeholder="5" placeholderTextColor={p.textMuted} style={[s.input, { color: p.textPrimary, backgroundColor: p.inputBg }]} />
                </View>
                <View style={{ width: 72 }}>
                  <Text style={s.fieldLabel}>SETS</Text>
                  <TextInput keyboardType="number-pad" value={sets} onChangeText={setSets} placeholder="3" placeholderTextColor={p.textMuted} style={[s.input, { color: p.textPrimary, backgroundColor: p.inputBg }]} />
                </View>
              </View>
            </>
          ) : null}

          {tab === "weight" ? (
            <>
              <Text style={s.fieldLabel}>WEIGHT (KG)</Text>
              <TextInput keyboardType="decimal-pad" value={bwKg} onChangeText={setBwKg} placeholder="72.5" placeholderTextColor={p.textMuted} style={[s.input, { color: p.textPrimary, backgroundColor: p.inputBg }]} />
            </>
          ) : null}

          {tab === "measure" ? (
            <>
              <Text style={[s.fieldLabel, { marginTop: 4 }]}>AREA</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 12 }}>
                {MEASURE_PRESETS.map((preset) => (
                  <Pressable
                    key={preset.kind}
                    onPress={() => { setMeasKind(preset.kind); if (preset.kind !== "other") setMeasLabel(""); }}
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 8,
                      borderRadius: 100,
                      backgroundColor: measKind === preset.kind ? p.accent : p.inputBg,
                    }}
                  >
                    <Text style={{ fontFamily: fonts.bodyRegular, fontSize: 13, color: measKind === preset.kind ? p.buttonPrimaryText : p.textPrimary }}>
                      {preset.label}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
              {measKind === "other" ? (
                <TextInput value={measLabel} onChangeText={setMeasLabel} placeholder="Label" placeholderTextColor={p.textMuted} style={[s.input, { color: p.textPrimary, backgroundColor: p.inputBg }]} />
              ) : null}
              <Text style={s.fieldLabel}>CM</Text>
              <TextInput keyboardType="decimal-pad" value={measCm} onChangeText={setMeasCm} placeholder="82" placeholderTextColor={p.textMuted} style={[s.input, { color: p.textPrimary, backgroundColor: p.inputBg }]} />
            </>
          ) : null}

          <Text style={[s.fieldLabel, { marginTop: 12 }]}>NOTES (OPTIONAL)</Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="How it felt..."
            placeholderTextColor={p.textMuted}
            multiline
            style={[s.input, { color: p.textPrimary, backgroundColor: p.inputBg, minHeight: 72, textAlignVertical: "top" }]}
          />

          <View style={{ flexDirection: "row", gap: 12, marginTop: 20 }}>
            <Pressable
              onPress={() => { Keyboard.dismiss(); setModalOpen(false); }}
              style={{ flex: 1, height: 50, borderRadius: 100, backgroundColor: p.inputBg, alignItems: "center", justifyContent: "center" }}
            >
              <Text style={{ fontFamily: fonts.labelBold, color: p.textSecondary }}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={() => { Keyboard.dismiss(); saveEntry(); }}
              style={{ flex: 1, height: 50, borderRadius: 100, backgroundColor: accentRing, alignItems: "center", justifyContent: "center" }}
            >
              <Text style={{ fontFamily: fonts.labelBold, color: "#FFF" }}>Save</Text>
            </Pressable>
          </View>
        </ScrollView>
      </AdaptiveSheet>
    </View>
  );
}

const s = StyleSheet.create({
  heroCard: {
    paddingHorizontal: 24,
    paddingBottom: 28,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  heroHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  ctaBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 100,
    marginTop: 16,
  },
  card: {
    borderRadius: 22,
    padding: 18,
    marginBottom: 14,
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  entryRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    gap: 12,
  },
  entryIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  fieldLabel: {
    fontFamily: fonts.labelCaps,
    fontSize: 11,
    color: "#999",
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 1.4,
  },
  dateBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 14,
    backgroundColor: "rgba(0,0,0,0.04)",
  },
  input: {
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    fontFamily: fonts.bodyRegular,
  },
});
