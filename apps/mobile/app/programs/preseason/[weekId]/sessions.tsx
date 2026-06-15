import React, { useCallback, useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useAppSelector } from "@/store/hooks";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { Text } from "@/components/ScaledText";
import { SkeletonBox } from "@/components/ui/legacy-skeleton";
import { usePreseasonSessions, type PreseasonSession } from "@/hooks/preseason/usePreseasonSessions";

const ACCENT = "#BBFF00";
const BG = "#0D0D0D";
const CARD = "#1A1A1A";
const TEXT_PRIMARY = "#FFFFFF";
const TEXT_MUTED = "#888888";
const BORDER_MUTED = "#2A2A2A";

const CATEGORY_COLOR: Record<string, string> = {
  PRIMER: "#C5A028",
  GAME: "#E05A00",
  RECOVERY: "#6B8CE8",
  STRENGTH: "#A855F7",
  SPEED: "#22C55E",
  CONDITIONING: "#06B6D4",
};

const DAY_ABBR: Record<number, string> = {
  1: "MON",
  2: "TUE",
  3: "WED",
  4: "THU",
  5: "FRI",
  6: "SAT",
  7: "SUN",
};

const DAY_FULL: Record<number, string> = {
  1: "Monday",
  2: "Tuesday",
  3: "Wednesday",
  4: "Thursday",
  5: "Friday",
  6: "Saturday",
  7: "Sunday",
};

function categoryColor(cat: string): string {
  return CATEGORY_COLOR[cat?.toUpperCase()] ?? "#555555";
}

function SessionCard({ session, index, onPress }: { session: PreseasonSession; index: number; onPress: () => void }) {
  const color = categoryColor(session.category);
  const abbr = DAY_ABBR[session.dayOfWeek] ?? "---";
  const full = DAY_FULL[session.dayOfWeek] ?? "";

  return (
    <Animated.View entering={FadeInDown.delay(index * 50).springify().damping(18)}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.sessionCard, pressed && { opacity: 0.8 }]}
        accessibilityRole="button"
      >
        <View style={[styles.sessionTopBorder, { backgroundColor: color }]} />
        <View style={styles.sessionBody}>
          <View style={styles.dayCol}>
            <Text style={[styles.dayNumber, { color }]}>{index + 1}</Text>
            <Text style={styles.dayAbbr}>{abbr}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <View style={styles.categoryRow}>
              <Text style={styles.dayFullLabel}>{full}</Text>
              <View style={[styles.categoryBadge, { backgroundColor: color + "22", borderColor: color + "55" }]}>
                <Text style={[styles.categoryText, { color }]}>
                  {session.category}
                </Text>
              </View>
            </View>
            <Text style={styles.sessionTitle} numberOfLines={1}>
              {session.title}
            </Text>
            <Text style={styles.sessionDesc} numberOfLines={2}>
              {session.description}
            </Text>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

export default function PreseasonSessionsScreen() {
  const { weekId: weekIdParam } = useLocalSearchParams<{ weekId: string }>();
  const weekId = weekIdParam ? parseInt(weekIdParam, 10) : null;
  const router = useRouter();
  const insets = useAppSafeAreaInsets();
  const token = useAppSelector((s) => s.user.token);
  const { weekType, sessions, loading, error, refresh } = usePreseasonSessions(token, weekId);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh(true);
    setRefreshing(false);
  }, [refresh]);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Navigation header */}
      <View style={styles.navRow}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} accessibilityLabel="Back">
          <ChevronLeft size={22} color={TEXT_PRIMARY} />
        </Pressable>
        <Text style={styles.navTitle}>
          {weekType?.name ?? `WEEK ${weekIdParam}`}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Sessions count badge */}
      {weekType && sessions.length > 0 ? (
        <View style={styles.countRow}>
          <Text style={styles.weekTypeName}>{weekType.name}</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{sessions.length} sessions</Text>
          </View>
        </View>
      ) : null}

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={ACCENT}
          />
        }
      >
        {loading && sessions.length === 0 ? (
          <View style={{ gap: 10 }}>
            {Array.from({ length: 7 }).map((_, i) => (
              <SkeletonBox key={i} width="100%" height={110} borderRadius={14} />
            ))}
          </View>
        ) : error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable onPress={() => refresh(true)} style={styles.retryBtn}>
              <Text style={styles.retryText}>Retry</Text>
            </Pressable>
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            {sessions.map((session, idx) => (
              <SessionCard
                key={session.id}
                session={session}
                index={idx}
                onPress={() =>
                  router.push(`/programs/preseason/day-session/${session.id}` as any)
                }
              />
            ))}
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
    letterSpacing: 0.5,
    flex: 1,
    textAlign: "center",
  },
  countRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  weekTypeName: {
    fontSize: 20,
    fontFamily: "Outfit-Bold",
    color: TEXT_PRIMARY,
    letterSpacing: -0.3,
    flex: 1,
  },
  countBadge: {
    backgroundColor: ACCENT + "22",
    borderRadius: 100,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: ACCENT + "44",
  },
  countText: {
    fontSize: 12,
    fontFamily: "Outfit-Bold",
    color: ACCENT,
    letterSpacing: 0.3,
  },
  scroll: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  sessionCard: {
    backgroundColor: CARD,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER_MUTED,
    overflow: "hidden",
  },
  sessionTopBorder: {
    height: 4,
    width: "100%",
  },
  sessionBody: {
    flexDirection: "row",
    padding: 14,
    gap: 14,
    alignItems: "flex-start",
  },
  dayCol: {
    alignItems: "center",
    minWidth: 36,
  },
  dayNumber: {
    fontSize: 28,
    fontFamily: "Outfit-Bold",
    letterSpacing: -1,
    lineHeight: 30,
  },
  dayAbbr: {
    fontSize: 11,
    fontFamily: "Outfit-Bold",
    color: TEXT_MUTED,
    letterSpacing: 0.5,
    marginTop: 2,
  },
  categoryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  dayFullLabel: {
    fontSize: 11,
    fontFamily: "Outfit-Regular",
    color: TEXT_MUTED,
  },
  categoryBadge: {
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderWidth: 1,
  },
  categoryText: {
    fontSize: 10,
    fontFamily: "Outfit-Bold",
    letterSpacing: 0.5,
  },
  sessionTitle: {
    fontSize: 15,
    fontFamily: "Outfit-Bold",
    color: TEXT_PRIMARY,
    marginBottom: 4,
    letterSpacing: -0.2,
  },
  sessionDesc: {
    fontSize: 12,
    fontFamily: "Outfit-Regular",
    color: TEXT_MUTED,
    lineHeight: 17,
  },
  errorBox: {
    alignItems: "center",
    paddingVertical: 40,
    gap: 12,
  },
  errorText: {
    fontSize: 14,
    fontFamily: "Outfit-Regular",
    color: TEXT_MUTED,
    textAlign: "center",
  },
  retryBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER_MUTED,
  },
  retryText: {
    fontSize: 14,
    fontFamily: "Outfit-Bold",
    color: TEXT_PRIMARY,
  },
});
