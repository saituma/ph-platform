import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useAppSelector } from "@/store/hooks";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { Text } from "@/components/ScaledText";
import { usePreseasonWeekTypes } from "@/hooks/preseason/usePreseasonWeekTypes";

const ACCENT = "#BBFF00";
const BG = "#0D0D0D";
const CARD = "#1A1A1A";
const ICON_BG = "#252500";
const TEXT_PRIMARY = "#FFFFFF";
const TEXT_MUTED = "#888888";
const BORDER_MUTED = "#2A2A2A";

export default function WeekTypeSelectScreen() {
  const { weekId: weekIdParam } = useLocalSearchParams<{ weekId: string }>();
  const weekId = weekIdParam ? parseInt(weekIdParam, 10) : null;
  const router = useRouter();
  const insets = useAppSafeAreaInsets();
  const token = useAppSelector((s) => s.user.token);
  const { weekTypes, loading, error, selectWeekType } = usePreseasonWeekTypes(token, weekId);
  const [selecting, setSelecting] = useState<number | null>(null);

  const handleSelect = useCallback(
    async (weekTypeId: number) => {
      if (selecting != null) return;
      setSelecting(weekTypeId);
      const result = await selectWeekType(weekTypeId);
      setSelecting(null);
      if (result && weekId != null) {
        router.replace(`/programs/preseason/${weekId}/sessions` as any);
      }
    },
    [selectWeekType, weekId, router, selecting],
  );

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Navigation header */}
      <View style={styles.navRow}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} accessibilityLabel="Back">
          <ChevronLeft size={22} color={TEXT_PRIMARY} />
        </Pressable>
        <Text style={styles.navTitle}>WEEK {weekIdParam}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Calendar icon */}
        <View style={styles.iconWrap}>
          <View style={styles.iconCircle}>
            <Calendar size={32} color={ACCENT} />
          </View>
        </View>

        {/* Title / subtitle */}
        <Text style={styles.title}>SELECT YOUR WEEK TYPE</Text>
        <Text style={styles.subtitle}>
          Choose the option that best matches your football schedule this week.
        </Text>

        {/* Week type cards */}
        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={ACCENT} />
          </View>
        ) : error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : (
          <View style={styles.cardList}>
            {weekTypes.map((wt, idx) => {
              const isSelecting = selecting === wt.id;
              return (
                <Animated.View
                  key={wt.id}
                  entering={FadeInDown.delay(idx * 60).springify().damping(18)}
                >
                  <Pressable
                    onPress={() => handleSelect(wt.id)}
                    disabled={selecting != null}
                    style={({ pressed }) => [
                      styles.typeCard,
                      pressed && { opacity: 0.75 },
                    ]}
                    accessibilityRole="button"
                  >
                    <View style={styles.typeIconBox}>
                      <Calendar size={20} color={ACCENT} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.typeName}>{wt.name.toUpperCase()}</Text>
                      <Text style={styles.typeDesc} numberOfLines={2}>
                        {wt.description}
                      </Text>
                    </View>
                    {isSelecting ? (
                      <ActivityIndicator size="small" color={ACCENT} />
                    ) : (
                      <ChevronRight size={18} color={TEXT_MUTED} />
                    )}
                  </Pressable>
                </Animated.View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
  },
  navRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: CARD,
    alignItems: "center",
    justifyContent: "center",
  },
  navTitle: {
    fontSize: 15,
    fontFamily: "Outfit-Bold",
    color: TEXT_PRIMARY,
    letterSpacing: 1,
  },
  scroll: {
    paddingHorizontal: 24,
    paddingBottom: 48,
    alignItems: "center",
  },
  iconWrap: {
    marginTop: 24,
    marginBottom: 24,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: ICON_BG,
    borderWidth: 1,
    borderColor: ACCENT + "33",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 20,
    fontFamily: "Outfit-Bold",
    color: TEXT_PRIMARY,
    letterSpacing: 0.5,
    textAlign: "center",
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: "Outfit-Regular",
    color: TEXT_MUTED,
    textAlign: "center",
    lineHeight: 21,
    marginBottom: 32,
    paddingHorizontal: 8,
  },
  cardList: {
    width: "100%",
    gap: 12,
  },
  typeCard: {
    backgroundColor: CARD,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER_MUTED,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 14,
  },
  typeIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: ICON_BG,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  typeName: {
    fontSize: 13,
    fontFamily: "Outfit-Bold",
    color: ACCENT,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  typeDesc: {
    fontSize: 13,
    fontFamily: "Outfit-Regular",
    color: TEXT_MUTED,
    lineHeight: 18,
  },
  loadingWrap: {
    paddingTop: 40,
  },
  errorBox: {
    paddingTop: 32,
    alignItems: "center",
  },
  errorText: {
    fontSize: 14,
    fontFamily: "Outfit-Regular",
    color: TEXT_MUTED,
    textAlign: "center",
  },
});
