import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { BottomSheetModal, BottomSheetView, BottomSheetBackdrop } from "@gorhom/bottom-sheet";
import { Moon, Sun, Star, Check, Clock } from "lucide-react-native";
import * as Haptics from "expo-haptics";

import { Text } from "@/components/ScaledText";
import { useAdminPastel } from "@/components/admin/AdminUI";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { fonts } from "@/constants/theme";
import type { SleepLogInput } from "./useSleepData";
import { getContentWidth } from "@/lib/contentWidth";

const SCREEN_W = getContentWidth();
const ITEM_HEIGHT = 52;
const VISIBLE_ITEMS = 5;
const PICKER_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;
const PADDING_ITEMS = Math.floor(VISIBLE_ITEMS / 2);

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function calcSleepMinutes(bedH: number, bedM: number, wakeH: number, wakeM: number): number {
  const bed = bedH * 60 + bedM;
  const wake = wakeH * 60 + wakeM;
  return wake > bed ? wake - bed : 1440 - bed + wake;
}

function formatHoursMin(totalMin: number): string {
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `${m}m`;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

// ── Scroll wheel column ──
function WheelColumn({
  data,
  selected,
  onSelect,
  accentColor,
  mutedColor,
  bgColor,
}: {
  data: number[];
  selected: number;
  onSelect: (val: number) => void;
  accentColor: string;
  mutedColor: string;
  bgColor: string;
}) {
  const listRef = useRef<FlatList>(null);
  const isUserScrolling = useRef(false);
  const lastReportedIdx = useRef(data.indexOf(selected));

  const paddedData = useMemo(() => {
    const top: (number | null)[] = Array.from({ length: PADDING_ITEMS }, () => null);
    const bottom: (number | null)[] = Array.from({ length: PADDING_ITEMS }, () => null);
    return [...top, ...data, ...bottom];
  }, [data]);

  const initialIndex = data.indexOf(selected);

  useEffect(() => {
    if (!isUserScrolling.current && listRef.current) {
      const idx = data.indexOf(selected);
      if (idx >= 0 && idx !== lastReportedIdx.current) {
        lastReportedIdx.current = idx;
        setTimeout(() => {
          listRef.current?.scrollToOffset({ offset: idx * ITEM_HEIGHT, animated: true });
        }, 50);
      }
    }
  }, [selected, data]);

  const onMomentumEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const y = e.nativeEvent.contentOffset.y;
      const idx = Math.round(y / ITEM_HEIGHT);
      const clamped = Math.max(0, Math.min(data.length - 1, idx));
      isUserScrolling.current = false;
      lastReportedIdx.current = clamped;
      if (data[clamped] !== selected) {
        Haptics.selectionAsync();
        onSelect(data[clamped]);
      }
    },
    [data, selected, onSelect],
  );

  const renderItem = useCallback(
    ({ item }: { item: number | null }) => {
      if (item === null) {
        return <View style={{ height: ITEM_HEIGHT }} />;
      }
      const isSelected = item === selected;
      return (
        <View style={{ height: ITEM_HEIGHT, justifyContent: "center", alignItems: "center" }}>
          <Text
            style={{
              fontFamily: isSelected ? fonts.heroNumber : fonts.bodyMedium,
              fontSize: isSelected ? 38 : 20,
              color: isSelected ? accentColor : mutedColor,
              opacity: isSelected ? 1 : 0.35,
            }}
          >
            {pad(item)}
          </Text>
        </View>
      );
    },
    [selected, accentColor, mutedColor],
  );

  const getItemLayout = useCallback(
    (_: any, index: number) => ({
      length: ITEM_HEIGHT,
      offset: ITEM_HEIGHT * index,
      index,
    }),
    [],
  );

  return (
    <View style={[styles.wheelContainer, { backgroundColor: bgColor }]}>
      <View
        pointerEvents="none"
        style={[
          styles.selectionHighlight,
          {
            top: PADDING_ITEMS * ITEM_HEIGHT,
            backgroundColor: accentColor + "15",
            borderColor: accentColor + "30",
          },
        ]}
      />
      <FlatList
        ref={listRef}
        data={paddedData}
        keyExtractor={(_, i) => String(i)}
        renderItem={renderItem}
        getItemLayout={getItemLayout}
        initialScrollIndex={initialIndex >= 0 ? initialIndex : 0}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        onMomentumScrollEnd={onMomentumEnd}
        onScrollBeginDrag={() => { isUserScrolling.current = true; }}
        style={{ height: PICKER_HEIGHT }}
        contentContainerStyle={{ alignItems: "center" }}
        nestedScrollEnabled
        overScrollMode="always"
        bounces
      />
    </View>
  );
}

// ── Animated star ──
function AnimatedStar({
  filled,
  onPress,
  color,
  mutedColor,
}: {
  filled: boolean;
  onPress: () => void;
  color: string;
  mutedColor: string;
}) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      onPress={() => {
        scale.value = withSequence(
          withSpring(1.35, { damping: 6, stiffness: 400 }),
          withSpring(1, { damping: 10, stiffness: 200 }),
        );
        onPress();
      }}
      hitSlop={10}
    >
      <Animated.View style={animStyle}>
        <Star
          size={32}
          color={filled ? color : mutedColor}
          fill={filled ? color : "transparent"}
          strokeWidth={1.5}
        />
      </Animated.View>
    </Pressable>
  );
}

interface SleepLogSheetProps {
  sheetRef: React.RefObject<BottomSheetModal | null>;
  onSave: (input: SleepLogInput) => Promise<void>;
}

export const SleepLogSheet = React.memo(function SleepLogSheet({
  sheetRef,
  onSave,
}: SleepLogSheetProps) {
  const p = useAdminPastel();
  const { isDark } = useAppTheme();

  const [mode, setMode] = useState<"bed" | "wake">("bed");
  const [bedH, setBedH] = useState(22);
  const [bedM, setBedM] = useState(30);
  const [wakeH, setWakeH] = useState(6);
  const [wakeM, setWakeM] = useState(45);
  const [quality, setQuality] = useState(3);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const snapPoints = useMemo(() => ["80%"], []);

  const totalMin = calcSleepMinutes(bedH, bedM, wakeH, wakeM);

  const accentColor = isDark ? "#9EF700" : "#2F9F3D";
  const wakeColor = isDark ? "#FFB020" : "#E8970A";
  const activeColor = mode === "bed" ? accentColor : wakeColor;
  const wheelBg = isDark ? p.inputBg : "#F6F8F5";

  const handleSave = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      await onSave({
        dateKey: todayKey(),
        totalMinutes: totalMin,
        bedTime: `${pad(bedH)}:${pad(bedM)}`,
        wakeTime: `${pad(wakeH)}:${pad(wakeM)}`,
        quality,
        notes: notes.trim() || null,
      });
      sheetRef.current?.dismiss();
    } finally {
      setSaving(false);
    }
  }, [saving, onSave, totalMin, bedH, bedM, wakeH, wakeM, quality, notes, sheetRef]);

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.4} />
    ),
    [],
  );

  const btnScale = useSharedValue(1);
  const btnStyle = useAnimatedStyle(() => ({
    transform: [{ scale: btnScale.value }],
  }));

  return (
    <BottomSheetModal
      ref={sheetRef}
      snapPoints={snapPoints}
      enableDynamicSizing={false}
      enableContentPanningGesture={false}
      backgroundStyle={{ backgroundColor: p.cardWhite, borderRadius: 32 }}
      handleIndicatorStyle={{ backgroundColor: p.textMuted, width: 40, height: 4, borderRadius: 2 }}
      backdropComponent={renderBackdrop}
    >
      <BottomSheetView style={styles.container}>
        <Text style={[styles.title, { color: p.textPrimary }]}>Log Sleep</Text>

        {/* Mode toggle */}
        <View style={[styles.modeRow, { backgroundColor: isDark ? p.inputBg : "#F1F5F0" }]}>
          <Pressable
            style={[
              styles.modeBtn,
              mode === "bed" && { backgroundColor: p.cardWhite },
              mode === "bed" && styles.modeBtnActive,
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setMode("bed");
            }}
          >
            <Moon size={16} color={mode === "bed" ? accentColor : p.textMuted} />
            <Text style={[styles.modeText, { color: mode === "bed" ? p.textPrimary : p.textMuted }]}>
              Bedtime
            </Text>
          </Pressable>
          <Pressable
            style={[
              styles.modeBtn,
              mode === "wake" && { backgroundColor: p.cardWhite },
              mode === "wake" && styles.modeBtnActive,
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setMode("wake");
            }}
          >
            <Sun size={16} color={mode === "wake" ? wakeColor : p.textMuted} />
            <Text style={[styles.modeText, { color: mode === "wake" ? p.textPrimary : p.textMuted }]}>
              Wake up
            </Text>
          </Pressable>
        </View>

        {/* Scroll wheels */}
        <View style={styles.wheelsRow}>
          <View style={styles.wheelCol}>
            <Text style={[styles.wheelLabel, { color: p.textMuted }]}>HOUR</Text>
            <WheelColumn
              data={HOURS}
              selected={mode === "bed" ? bedH : wakeH}
              onSelect={(v) => (mode === "bed" ? setBedH(v) : setWakeH(v))}
              accentColor={activeColor}
              mutedColor={p.textMuted}
              bgColor={wheelBg}
            />
          </View>

          <Text style={[styles.wheelColon, { color: activeColor }]}>:</Text>

          <View style={styles.wheelCol}>
            <Text style={[styles.wheelLabel, { color: p.textMuted }]}>MIN</Text>
            <WheelColumn
              data={MINUTES}
              selected={mode === "bed" ? bedM : wakeM}
              onSelect={(v) => (mode === "bed" ? setBedM(v) : setWakeM(v))}
              accentColor={activeColor}
              mutedColor={p.textMuted}
              bgColor={wheelBg}
            />
          </View>
        </View>

        {/* Total sleep */}
        <View style={[styles.totalPill, { backgroundColor: isDark ? p.inputBg : "#F1F5F0" }]}>
          <Clock size={14} color={p.textMuted} />
          <Text style={[styles.totalText, { color: p.textMuted }]}>Total sleep</Text>
          <Text style={[styles.totalValue, { color: p.textPrimary }]}>
            {formatHoursMin(totalMin)}
          </Text>
        </View>

        {/* Quality stars */}
        <View style={styles.qualitySection}>
          <Text style={[styles.sectionLabel, { color: p.textSecondary }]}>Sleep Quality</Text>
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((n) => (
              <AnimatedStar
                key={n}
                filled={n <= quality}
                color={accentColor}
                mutedColor={p.textMuted}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setQuality(n);
                }}
              />
            ))}
          </View>
        </View>

        {/* Save */}
        <Pressable
          onPress={handleSave}
          disabled={saving}
          onPressIn={() => {
            btnScale.value = withSpring(0.95, { damping: 15, stiffness: 300 });
          }}
          onPressOut={() => {
            btnScale.value = withSpring(1, { damping: 12, stiffness: 200 });
          }}
        >
          <Animated.View style={[styles.saveBtn, { backgroundColor: accentColor }, btnStyle]}>
            <Check size={18} color={isDark ? "#0C0A09" : "#FFFFFF"} strokeWidth={3} />
            <Text style={[styles.saveBtnText, { color: isDark ? "#0C0A09" : "#FFFFFF" }]}>
              {saving ? "Saving..." : "Save Sleep Log"}
            </Text>
          </Animated.View>
        </Pressable>
      </BottomSheetView>
    </BottomSheetModal>
  );
});

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    paddingBottom: 32,
    gap: 14,
  },
  title: {
    fontFamily: fonts.heading1,
    fontSize: 24,
    textAlign: "center",
    marginBottom: 2,
  },
  modeRow: {
    flexDirection: "row",
    borderRadius: 16,
    padding: 4,
    gap: 4,
  },
  modeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
  },
  modeBtnActive: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  modeText: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
  },
  wheelsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 4,
  },
  wheelCol: {
    alignItems: "center",
    gap: 6,
  },
  wheelLabel: {
    fontFamily: fonts.labelBold,
    fontSize: 10,
    letterSpacing: 1,
  },
  wheelContainer: {
    width: (SCREEN_W - 80) / 2.4,
    borderRadius: 22,
    overflow: "hidden",
  },
  selectionHighlight: {
    position: "absolute",
    left: 8,
    right: 8,
    height: ITEM_HEIGHT,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  wheelColon: {
    fontFamily: fonts.heroNumber,
    fontSize: 44,
    marginTop: 22,
  },
  totalPill: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 14,
  },
  totalText: {
    fontFamily: fonts.bodyRegular,
    fontSize: 14,
  },
  totalValue: {
    fontFamily: fonts.statNumber,
    fontSize: 18,
    marginLeft: 4,
  },
  qualitySection: {
    gap: 10,
    paddingTop: 2,
  },
  sectionLabel: {
    fontFamily: fonts.labelBold,
    fontSize: 12,
    letterSpacing: 0.4,
    textTransform: "uppercase",
    textAlign: "center",
  },
  starsRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
  },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 54,
    borderRadius: 100,
    marginTop: 4,
  },
  saveBtnText: {
    fontFamily: fonts.accentBold,
    fontSize: 16,
  },
});
