import React, { memo, useCallback, useMemo } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { FlashList } from "@shopify/flash-list";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useAppSelector } from "@/store/hooks";
import { useAppSafeAreaInsets } from "@/hooks/useAppSafeAreaInsets";
import { Text } from "@/components/ScaledText";
import {
  usePreseasonWeekTypes,
  type PreseasonWeekType,
} from "@/hooks/preseason/usePreseasonWeekTypes";

const ACCENT = "#BBFF00";
const BG = "#0D0D0D";
const CARD = "#1A1A1A";
const ICON_BG = "#252500";
const TEXT_PRIMARY = "#FFFFFF";
const TEXT_MUTED = "#888888";
const BORDER_MUTED = "#2A2A2A";

const WeekTypeSeparator = () => <View style={{ height: 12 }} />;

const WeekTypeCard = memo(function WeekTypeCard({
  weekType,
  isSelecting,
  disabled,
  onSelect,
}: {
  weekType: PreseasonWeekType;
  isSelecting: boolean;
  disabled: boolean;
  onSelect: (weekTypeId: number) => void;
}) {
  return (
    <Animated.View entering={FadeInDown.springify().damping(18)}>
      <Pressable
        onPress={() => onSelect(weekType.id)}
        disabled={disabled}
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
          <Text style={styles.typeName}>{weekType.name.toUpperCase()}</Text>
          <Text style={styles.typeDesc} numberOfLines={2}>
            {weekType.description}
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
});

export default function WeekTypeSelectScreen() {
  const { weekId: weekIdParam, weekNumber: weekNumberParam } = useLocalSearchParams<{
    weekId: string;
    weekNumber?: string;
  }>();
  const weekId = weekIdParam ? parseInt(weekIdParam, 10) : null;
  const weekNumber = weekNumberParam ? parseInt(weekNumberParam, 10) : null;
  const router = useRouter();
  const insets = useAppSafeAreaInsets();
  const token = useAppSelector((s) => s.user.token);
  const { weekTypes, loading, error, selectWeekType, selecting, selectError } =
    usePreseasonWeekTypes(token, weekId);

  const handleSelect = useCallback(
    async (weekTypeId: number) => {
      if (selecting != null) return;
      try {
        await selectWeekType(weekTypeId);
        if (weekId != null) {
          router.replace(
            `/programs/preseason/${weekId}/sessions?weekNumber=${weekNumber ?? ""}` as any,
          );
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to select week type.";
        Alert.alert("Couldn't save selection", message, [{ text: "OK" }]);
      }
    },
    [selectWeekType, weekId, weekNumber, router, selecting],
  );

  const displayWeekNumber = weekNumber ?? weekId;

  const weekTypeKeyExtractor = useCallback((weekType: PreseasonWeekType) => String(weekType.id), []);

  const renderWeekType = useCallback(
    ({ item }: { item: PreseasonWeekType }) => (
      <WeekTypeCard
        weekType={item}
        isSelecting={selecting === item.id}
        disabled={selecting != null}
        onSelect={handleSelect}
      />
    ),
    [handleSelect, selecting],
  );

  const listHeader = useMemo(
    () => (
      <>
        <View style={styles.iconWrap}>
          <View style={styles.iconCircle}>
            <Calendar size={32} color={ACCENT} />
          </View>
        </View>

        <Text style={styles.title}>SELECT YOUR WEEK TYPE</Text>
        <Text style={styles.subtitle}>
          Choose the option that best matches your football schedule this week.
        </Text>

        {selectError ? (
          <View style={styles.inlineError}>
            <Text style={styles.inlineErrorText}>{selectError}</Text>
          </View>
        ) : null}
      </>
    ),
    [selectError],
  );

  const listEmpty = useMemo(() => {
    if (loading) {
      return (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={ACCENT} />
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      );
    }

    return null;
  }, [error, loading]);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.navRow}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} accessibilityLabel="Back">
          <ChevronLeft size={22} color={TEXT_PRIMARY} />
        </Pressable>
        <Text style={styles.navTitle}>WEEK {displayWeekNumber}</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlashList
        data={weekTypes}
        renderItem={renderWeekType}
        keyExtractor={weekTypeKeyExtractor}
        estimatedItemSize={130}
        style={{ flex: 1 }}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={listEmpty}
        ItemSeparatorComponent={WeekTypeSeparator}
      />
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
  },
  iconWrap: {
    marginTop: 24,
    marginBottom: 24,
    alignSelf: "center",
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
  inlineError: {
    width: "100%",
    backgroundColor: "#3A1A1A",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#8B2020",
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 20,
  },
  inlineErrorText: {
    fontSize: 13,
    fontFamily: "Outfit-Regular",
    color: "#FF6B6B",
    textAlign: "center",
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
