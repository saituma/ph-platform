import React, { memo, useCallback, useMemo, useState } from "react";
import {
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from "react-native";
import { FlashList } from "@shopify/flash-list";
import { useRouter } from "expo-router";
import { Bell, ChevronLeft, ChevronRight, Lock, Check } from "lucide-react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useAppSelector } from "@/store/hooks";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { Text } from "@/components/ScaledText";
import { SkeletonBox } from "@/components/ui/legacy-skeleton";
import {
  usePreseasonProgramme,
  type PreseasonWeek,
} from "@/hooks/preseason/usePreseasonProgramme";

const ACCENT = "#BBFF00";
const BG = "#0D0D0D";
const CARD = "#1A1A1A";
const CARD_MUTED = "#161616";
const TEXT_PRIMARY = "#FFFFFF";
const TEXT_MUTED = "#888888";
const TEXT_DIMMED = "#555555";
const BORDER_MUTED = "#2A2A2A";

const WeekSeparator = () => <View style={{ height: 10 }} />;

const WeekCard = memo(function WeekCard({
  week,
  index,
  onPress,
}: {
  week: PreseasonWeek;
  index: number;
  onPress: (week: PreseasonWeek) => void;
}) {
  const isActive = week.status === "active";
  const isLocked = week.status === "locked";
  const isCompleted = week.status === "completed";

  return (
    <Animated.View entering={FadeInDown.delay(index * 40).springify().damping(18)}>
      <Pressable
        onPress={() => onPress(week)}
        disabled={isLocked}
        style={({ pressed }) => [
          styles.weekCard,
          isActive && styles.weekCardActive,
          isLocked && styles.weekCardLocked,
          pressed && !isLocked && { opacity: 0.8 },
        ]}
        accessibilityRole="button"
        accessibilityState={{ disabled: isLocked }}
      >
        {isActive && <View style={styles.activeBar} />}
        <View style={styles.weekCardInner}>
          <View style={{ flex: 1 }}>
            <Text
              style={[
                styles.weekLabel,
                isLocked && styles.weekLabelLocked,
                isActive && styles.weekLabelActive,
              ]}
            >
              WEEK {week.weekNumber}
            </Text>
            <Text
              style={[
                styles.weekSub,
                isLocked && styles.weekSubLocked,
              ]}
            >
              {isCompleted
                ? "Completed"
                : isActive && week.selectedWeekTypeId == null
                ? "Select your week type"
                : isActive
                ? "View sessions"
                : `Complete Week ${week.weekNumber - 1} to unlock`}
            </Text>
          </View>
          {isLocked ? (
            <Lock size={18} color={TEXT_DIMMED} />
          ) : isCompleted ? (
            <View style={styles.checkBadge}>
              <Check size={14} color={BG} strokeWidth={3} />
            </View>
          ) : (
            <ChevronRight size={20} color={ACCENT} />
          )}
        </View>
      </Pressable>
    </Animated.View>
  );
});

export default function PreseasonProgrammeScreen() {
  const router = useRouter();
  const insets = useAppSafeAreaInsets();
  const token = useAppSelector((s) => s.user.token);
  const capabilities = useAppSelector((s) => s.user.capabilities);
  const { programme, weeks, loading, error, refresh } = usePreseasonProgramme(token);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  const handleWeekPress = useCallback(
    (week: PreseasonWeek) => {
      if (week.status === "locked") return;
      if (week.selectedWeekTypeId != null || week.status === "completed") {
        router.push(`/programs/preseason/${week.id}/sessions?weekNumber=${week.weekNumber}` as any);
      } else {
        router.push(`/programs/preseason/${week.id}?weekNumber=${week.weekNumber}` as any);
      }
    },
    [router],
  );

  const weekKeyExtractor = useCallback((week: PreseasonWeek) => String(week.id), []);

  const renderWeek = useCallback(
    ({ item, index }: { item: PreseasonWeek; index: number }) => (
      <WeekCard week={item} index={index} onPress={handleWeekPress} />
    ),
    [handleWeekPress],
  );

  const listHeader = useMemo(
    () => (
      <View style={styles.titleBlock}>
        <Text style={styles.displayTitle}>PROGRAMME</Text>
        {programme ? (
          <>
            <Text style={styles.programmeName}>{programme.title}</Text>
            <Text style={styles.weekCount}>{programme.weekCount} Weeks</Text>
          </>
        ) : loading ? (
          <>
            <SkeletonBox width={180} height={20} borderRadius={6} />
            <SkeletonBox width={80} height={16} borderRadius={6} />
          </>
        ) : null}
      </View>
    ),
    [loading, programme],
  );

  const listEmpty = useMemo(() => {
    if (loading) {
      return (
        <View style={{ gap: 10 }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonBox key={i} width="100%" height={76} borderRadius={14} />
          ))}
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable onPress={() => refresh()} style={styles.retryBtn}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      );
    }

    if (weeks.length === 0) {
      return (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>No preseason content available</Text>
        </View>
      );
    }

    return null;
  }, [error, loading, refresh, weeks.length]);

  if (!capabilities?.preseasonProgramme) {
    return (
      <View style={[styles.root, { paddingTop: insets.top, justifyContent: "center", alignItems: "center" }]}>
        <View style={styles.capabilityFallback}>
          <Text style={styles.fallbackTitle}>Program Not Available</Text>
          <Text style={styles.fallbackText}>This preseason program is not available for your current plan.</Text>
          <Pressable onPress={() => router.back()} style={styles.fallbackBtn}>
            <Text style={styles.fallbackBtnText}>Go Back</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} accessibilityLabel="Back">
          <ChevronLeft size={22} color={TEXT_PRIMARY} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerBrand}>PH</Text>
          <Text style={styles.headerSub}>PERFORMANCE</Text>
        </View>
        <Pressable
          onPress={() => router.push("/notifications" as any)}
          style={styles.bellBtn}
          accessibilityLabel="Notifications"
        >
          <Bell size={20} color={TEXT_PRIMARY} />
        </Pressable>
      </View>

      <FlashList
        data={weeks}
        renderItem={renderWeek}
        keyExtractor={weekKeyExtractor}
        estimatedItemSize={120}
        style={{ flex: 1 }}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={listEmpty}
        ItemSeparatorComponent={WeekSeparator}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={ACCENT}
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
    gap: 8,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: CARD,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  headerBrand: {
    fontSize: 28,
    fontFamily: "Outfit-Bold",
    color: TEXT_PRIMARY,
    letterSpacing: -1,
    lineHeight: 30,
  },
  headerSub: {
    fontSize: 10,
    fontFamily: "Outfit-Regular",
    color: TEXT_MUTED,
    letterSpacing: 2.5,
    marginTop: 1,
  },
  bellBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: CARD,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  scroll: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  titleBlock: {
    paddingTop: 20,
    paddingBottom: 28,
    gap: 4,
  },
  displayTitle: {
    fontSize: 42,
    fontFamily: "Outfit-Bold",
    color: TEXT_PRIMARY,
    letterSpacing: -1.5,
    lineHeight: 44,
    marginBottom: 6,
  },
  programmeName: {
    fontSize: 16,
    fontFamily: "Outfit-Regular",
    color: TEXT_PRIMARY,
    opacity: 0.75,
  },
  weekCount: {
    fontSize: 14,
    fontFamily: "Outfit-Regular",
    color: TEXT_MUTED,
    marginTop: 2,
  },
  weekCard: {
    backgroundColor: CARD,
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: BORDER_MUTED,
  },
  weekCardActive: {
    borderColor: ACCENT,
    borderWidth: 1,
  },
  weekCardLocked: {
    backgroundColor: CARD_MUTED,
    borderColor: "#1F1F1F",
  },
  activeBar: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: ACCENT,
    borderTopLeftRadius: 14,
    borderBottomLeftRadius: 14,
  },
  weekCardInner: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 18,
    gap: 12,
  },
  weekLabel: {
    fontSize: 15,
    fontFamily: "Outfit-Bold",
    color: TEXT_PRIMARY,
    letterSpacing: 0.5,
  },
  weekLabelActive: {
    color: TEXT_PRIMARY,
  },
  weekLabelLocked: {
    color: TEXT_DIMMED,
  },
  weekSub: {
    fontSize: 13,
    fontFamily: "Outfit-Regular",
    color: TEXT_MUTED,
    marginTop: 3,
  },
  weekSubLocked: {
    color: TEXT_DIMMED,
  },
  checkBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: ACCENT,
    alignItems: "center",
    justifyContent: "center",
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
  emptyBox: {
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: "Outfit-Regular",
    color: TEXT_MUTED,
    textAlign: "center",
  },
  capabilityFallback: {
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 24,
  },
  fallbackTitle: {
    fontSize: 20,
    fontFamily: "Outfit-Bold",
    color: TEXT_PRIMARY,
    textAlign: "center",
  },
  fallbackText: {
    fontSize: 14,
    fontFamily: "Outfit-Regular",
    color: TEXT_MUTED,
    textAlign: "center",
  },
  fallbackBtn: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER_MUTED,
  },
  fallbackBtnText: {
    fontSize: 14,
    fontFamily: "Outfit-Bold",
    color: TEXT_PRIMARY,
  },
});
