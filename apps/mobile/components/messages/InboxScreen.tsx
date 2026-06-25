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
import { Search, XCircle, MessageSquare } from "lucide-react-native";

import { useAdminPastel } from "@/components/admin/AdminUI";
import { ThreadListItem } from "@/components/messages/inbox";
import { Text } from "@/components/ScaledText";
import { SkeletonMessagingScreen } from "@/components/ui/legacy-skeleton";
import type { MessageThread, TypingStatus } from "@/types/messages";

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
  headerContent?: React.ReactNode;
};

const InboxEmptyState = function InboxEmptyState() {
  const p = useAdminPastel();
  return (
    <Animated.View entering={FadeIn.delay(200)} style={styles.emptyContainer}>
      <View
        style={[
          styles.emptyIconContainer,
          { backgroundColor: p.accentSoft },
        ]}
      >
        <MessageSquare size={48} color={p.accent} strokeWidth={1.5} />
      </View>
      <Text
        style={{
          fontFamily: "Outfit-Bold",
          fontSize: 24,
          marginBottom: 12,
          textAlign: "center",
          color: p.textPrimary,
        }}
      >
        Your Inbox is Empty
      </Text>
      <Text
        style={{
          fontFamily: "Outfit-Regular",
          fontSize: 16,
          textAlign: "center",
          lineHeight: 24,
          color: p.textMuted,
        }}
      >
        When you connect with your team, coach, or friends, your messages will show up here.
      </Text>
    </Animated.View>
  );
};

function InboxScreenBase({
  threads,
  typingStatus,
  isLoading,
  openingThreadId,
  onRefresh,
  onOpenThread,
  headerContent,
}: InboxScreenProps) {
  const p = useAdminPastel();

  const [searchText, setSearchText] = useState("");
  const deferredSearch = useDeferredValue(searchText);

  const filteredThreads = React.useMemo(() => {
    const query = deferredSearch.trim().toLowerCase();
    if (!query) return threads;
    return threads.filter(
      (thread) =>
        thread.name?.toLowerCase().includes(query) ||
        thread.preview?.toLowerCase().includes(query),
    );
  }, [threads, deferredSearch]);

  // Always sort unread first within the filtered set
  const listData = React.useMemo(() => {
    const unread = filteredThreads.filter((t) => (t.unread ?? 0) > 0);
    const read = filteredThreads.filter((t) => !(t.unread ?? 0));
    return [...unread, ...read];
  }, [filteredThreads]);

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

  const listHeader = React.useMemo(
    () => (
      <View>
        {headerContent}
        <View style={styles.headerBlock}>
          <View style={styles.searchWrap}>
            <View style={[styles.searchInner, { backgroundColor: p.inputBg }]}>
              <Search size={18} color={p.textMuted} strokeWidth={2} />
              <TextInput
                placeholder="Search conversations..."
                placeholderTextColor={p.textMuted}
                value={searchText}
                onChangeText={setSearchText}
                style={[
                  styles.searchInput,
                  { fontFamily: "Outfit-Regular", color: p.textPrimary },
                ]}
                returnKeyType="search"
                autoCorrect={false}
                clearButtonMode="while-editing"
              />
              {searchText.length > 0 && Platform.OS === "android" && (
                <Pressable onPress={clearSearch} style={styles.clearBtn}>
                  <XCircle size={18} color={p.textMuted} strokeWidth={2} />
                </Pressable>
              )}
            </View>
          </View>
        </View>
      </View>
    ),
    [headerContent, p, searchText, setSearchText, clearSearch],
  );

  if (isLoading) {
    return (
      <View style={[styles.screen, { backgroundColor: p.pageBg }]}>
        <SkeletonMessagingScreen />
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: p.pageBg }]}>
      {listData.length > 0 ? (
        <FlashList
          data={listData}
          renderItem={renderItem}
          keyExtractor={(item: MessageThread) => item.id}
          estimatedItemSize={88}
          ListHeaderComponent={listHeader}
          style={{ width: "100%" }}
          contentContainerStyle={{
            width: "100%",
            alignItems: "stretch",
            paddingTop: 0,
            paddingBottom: Platform.OS === "ios" ? 140 : 120,
          }}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={onRefresh}
              tintColor={p.accent}
            />
          }
          ItemSeparatorComponent={undefined}
        />
      ) : (
        <>
          {listHeader}
          <InboxEmptyState />
        </>
      )}
    </View>
  );
}

export const InboxScreen = InboxScreenBase;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  headerBlock: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 10,
  },
  searchWrap: {
    marginBottom: 4,
  },
  searchInner: {
    height: 44,
    borderRadius: 22,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    gap: 10,
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
});
