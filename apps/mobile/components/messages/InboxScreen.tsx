import { Ionicons } from "@expo/vector-icons";
import { FlashList } from "@shopify/flash-list";
import React, { useCallback, useDeferredValue, useState } from "react";
import {
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";

import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { ThreadListItem } from "@/components/messages/inbox";
import { Text } from "@/components/ScaledText";
import { SkeletonMessagingScreen } from "@/components/ui/Skeleton";
import type { MessageThread, TypingStatus } from "@/types/messages";

// ── Props ────────────────────────────────────────────────────────────

type InboxScreenProps = {
  threads: MessageThread[];
  typingStatus: TypingStatus;
  isLoading: boolean;
  openingThreadId: string | null;
  onRefresh: () => Promise<void>;
  onOpenThread: (
    thread: MessageThread,
    sharedBoundTag?: string,
    avatarTag?: string,
  ) => void;
  variant?: "default" | "team";
  showEmptySections?: boolean;
};

type InboxFilter = "all" | "unread";

// ── Inbox search / filters (thread rows use ThreadListItem + list-row UI) ─

interface FilterPillProps {
  label: string;
  active: boolean;
  onPress: () => void;
  count?: number;
}

const FilterPill = function FilterPill({
  label,
  active,
  onPress,
  count,
}: FilterPillProps) {
  const { colors, isDark } = useAppTheme();

  const bg = active
    ? colors.accent
    : isDark
      ? "hsl(220, 5%, 92%)"
      : "hsl(220, 8%, 12%)";

  const textColor = active
    ? "hsl(220, 5%, 98%)"
    : isDark
      ? "hsl(220, 8%, 10%)"
      : "hsl(220, 5%, 94%)";

  const badgeBg = active
    ? "rgba(255,255,255,0.22)"
    : isDark
      ? "rgba(0,0,0,0.12)"
      : "rgba(255,255,255,0.18)";

  const badgeText = active
    ? "hsl(220, 5%, 98%)"
    : isDark
      ? "hsl(220, 8%, 10%)"
      : "hsl(220, 5%, 94%)";

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }: { pressed: boolean }) => [
        styles.filterPill,
        {
          backgroundColor: bg,
          borderWidth: 1,
          borderColor: active
            ? colors.accent
            : isDark
              ? "hsl(220, 5%, 85%)"
              : "hsl(220, 8%, 18%)",
          transform: [{ scale: pressed ? 0.95 : 1 }],
        },
      ]}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={`Filter by ${label}`}
    >
      <Text
        style={[
          styles.filterPillText,
          {
            fontFamily: active ? "Outfit-Bold" : "Outfit-Medium",
            color: textColor,
          },
        ]}
      >
        {label}
      </Text>
      {count !== undefined && count > 0 && (
        <View style={[styles.pillBadge, { backgroundColor: badgeBg }]}>
          <Text style={[styles.pillBadgeText, { color: badgeText }]}>
            {count}
          </Text>
        </View>
      )}
    </Pressable>
  );
};

// ── Empty State ──────────────────────────────────────────────────────

const InboxEmptyState = function InboxEmptyState() {
  const { colors, isDark } = useAppTheme();
  return (
    <Animated.View entering={FadeIn.delay(200)} style={styles.emptyContainer}>
      <View
        style={[
          styles.emptyIconContainer,
          { backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)" },
        ]}
      >
        <Ionicons
          name="chatbubbles"
          size={56}
          color={colors.textDim}
        />
      </View>
      <Text
        style={[
          styles.emptyTitle,
          { fontFamily: "Chillax-Semibold", color: colors.textPrimary },
        ]}
      >
        Your Inbox is Empty
      </Text>
      <Text
        style={[
          styles.emptySubtext,
          { fontFamily: "Outfit-Regular", color: colors.textSecondary },
        ]}
      >
        When you connect with your team, coach, or friends, your messages will show up here.
      </Text>
    </Animated.View>
  );
};

// ── Main ─────────────────────────────────────────────────────────────

function InboxScreenBase({
  threads,
  typingStatus,
  isLoading,
  openingThreadId,
  onRefresh,
  onOpenThread,
}: InboxScreenProps) {
  const { colors, isDark } = useAppTheme();

  const [searchText, setSearchText] = useState("");
  const [activeFilter, setActiveFilter] = useState<InboxFilter>("all");
  const deferredSearch = useDeferredValue(searchText);

  const unreadThreadsCount = React.useMemo(
    () => threads.filter((t) => (t.unread ?? 0) > 0).length,
    [threads],
  );

  const filteredThreads = React.useMemo(() => {
    const query = deferredSearch.trim().toLowerCase();

    return threads.filter((thread) => {
      const matchesFilter =
        activeFilter === "all" ? true : (thread.unread ?? 0) > 0;
      if (!matchesFilter) return false;
      if (!query) return true;

      return (
        thread.name?.toLowerCase().includes(query) ||
        thread.preview?.toLowerCase().includes(query)
      );
    });
  }, [threads, deferredSearch, activeFilter]);

  const listData = React.useMemo(() => {
    if (activeFilter === "unread") return filteredThreads;

    const unread = filteredThreads.filter((t) => (t.unread ?? 0) > 0);
    const read = filteredThreads.filter((t) => !(t.unread ?? 0));
    return [...unread, ...read];
  }, [filteredThreads, activeFilter]);

  const clearSearch = useCallback(() => {
    setSearchText("");
  }, []);

  const renderItem = useCallback(
    ({ item, index }: { item: MessageThread; index: number }) => (
      <ThreadListItem
        thread={item}
        typingStatus={typingStatus[item.id.startsWith("group:") ? item.id : `user:${item.id}`]}
        openingThreadId={openingThreadId}
        onOpenThread={onOpenThread}
        index={index}
      />
    ),
    [typingStatus, openingThreadId, onOpenThread],
  );

  if (isLoading) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.background }]}>
        <SkeletonMessagingScreen />
      </View>
    );
  }

  const screenBg = colors.background;

  return (
    <View style={[styles.screen, { backgroundColor: screenBg }]}>
      <Animated.View entering={FadeIn.duration(200)} style={styles.headerBlock}>


        <View style={styles.searchWrap}>
          <View
            style={[
              styles.searchInner,
              {
                backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
                borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)",
                borderWidth: 1,
              },
            ]}
          >
            <Ionicons name="search" size={20} color={colors.textDim} />
            <TextInput
              placeholder="Search conversations..."
              placeholderTextColor={colors.textDim}
              value={searchText}
              onChangeText={setSearchText}
              style={[
                styles.searchInput,
                { fontFamily: "Outfit-Medium", color: colors.textPrimary },
              ]}
              returnKeyType="search"
              autoCorrect={false}
              clearButtonMode="while-editing"
            />
            {searchText.length > 0 && Platform.OS === "android" && (
               <Pressable onPress={clearSearch} style={styles.clearBtn}>
                 <Ionicons name="close-circle" size={20} color={colors.textDim} />
               </Pressable>
            )}
          </View>
        </View>

        <View style={styles.filterTabs}>
          <FilterPill
            label="All Messages"
            active={activeFilter === "all"}
            onPress={() => setActiveFilter("all")}
          />
          <FilterPill
            label="Unread"
            active={activeFilter === "unread"}
            onPress={() => setActiveFilter("unread")}
            count={unreadThreadsCount}
          />
        </View>
      </Animated.View>

      {listData.length > 0 ? (
        <FlashList
          data={listData}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          style={{ width: "100%" }}
          contentContainerStyle={{
            width: "100%",
            alignItems: "stretch",
            paddingTop: 0,
            paddingBottom: Platform.OS === "ios" ? 140 : 120,
          }}
          refreshControl={
            <RefreshControl
              refreshing={false}
              onRefresh={onRefresh}
              tintColor={colors.accent}
            />
          }
          ItemSeparatorComponent={undefined}
        />
      ) : (
        <InboxEmptyState />
      )}
    </View>
  );
}

export const InboxScreen = InboxScreenBase;

// ── Styles ───────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  headerBlock: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
  },

  searchWrap: {
    marginBottom: 12,
  },
  searchInner: {
    height: 36,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 0,
    ...Platform.select({
      android: { paddingBottom: 2 },
    }),
  },
  clearBtn: {
    padding: 4,
  },
  filterTabs: {
    flexDirection: "row",
    gap: 10,
  },
  filterPill: {
    height: 38,
    borderRadius: 19,
    flexDirection: "row",
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  filterPillText: {
    fontSize: 15,
  },
  pillBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  pillBadgeText: {
    fontSize: 12,
    fontFamily: "Outfit-Bold",
  },
  // --- Empty state ---
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: Platform.OS === "ios" ? 140 : 120,
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 26,
    marginBottom: 12,
    textAlign: "center",
  },
  emptySubtext: {
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
  },
});
