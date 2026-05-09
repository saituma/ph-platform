import React, { useCallback, useState } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useQueryClient } from "@tanstack/react-query";
import { useAdminPastel } from "@/components/admin/AdminUI";
import { Text } from "@/components/ScaledText";
import type { Story } from "@/hooks/useStories";
import { markStoryViewedApi } from "@/hooks/useStories";
import { queryKeys } from "@/lib/queryKeys";
import { useAppSelector } from "@/store/hooks";
import { StoryViewer } from "./StoryViewer";

type Props = {
  stories: Story[];
};

const CIRCLE_SIZE = 64;
const RING_SIZE = 72;
const ITEM_WIDTH = 80;

function StoryCircle({
  story,
  onPress,
}: {
  story: Story;
  onPress: () => void;
}) {
  const p = useAdminPastel();

  const ringContent = (
    <View style={[styles.innerRing, { backgroundColor: p.pageBg }]}>
      <Image
        source={{ uri: story.mediaUrl }}
        style={styles.avatar}
        contentFit="cover"
        transition={200}
      />
    </View>
  );

  return (
    <Pressable onPress={onPress} style={styles.item}>
      {story.viewed ? (
        <View style={[styles.ring, { backgroundColor: p.divider }]}>
          {ringContent}
        </View>
      ) : (
        <LinearGradient
          colors={[p.accent, "#F77737", "#FCAF45"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.ring}
        >
          {ringContent}
        </LinearGradient>
      )}
      {story.badge ? (
        <View style={[styles.badge, { backgroundColor: p.accent }]}>
          <Text
            style={{
              fontFamily: "Outfit-Bold",
              fontSize: 9,
              color: p.buttonPrimaryText,
              textTransform: "uppercase",
            }}
          >
            {story.badge}
          </Text>
        </View>
      ) : null}
      <Text
        numberOfLines={1}
        style={{
          fontFamily: "Outfit-Regular",
          fontSize: 11,
          color: p.textSecondary,
          textAlign: "center",
          marginTop: 4,
          width: ITEM_WIDTH,
        }}
      >
        {story.title}
      </Text>
    </Pressable>
  );
}

export const StoriesRow = React.memo(function StoriesRow({ stories }: Props) {
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const token = useAppSelector((s) => s.user.token);
  const queryClient = useQueryClient();

  const openStory = useCallback((index: number) => {
    setViewerIndex(index);
  }, []);

  const handleStoryViewed = useCallback(
    (storyId: number) => {
      if (!token) return;
      markStoryViewedApi(storyId, token).then(() => {
        queryClient.invalidateQueries({ queryKey: queryKeys.stories.all() });
      });
    },
    [token, queryClient],
  );

  const closeViewer = useCallback(() => {
    setViewerIndex(null);
  }, []);

  if (!stories.length) return null;

  return (
    <>
      <FlatList
        data={stories}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.list}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item, index }) => (
          <StoryCircle story={item} onPress={() => openStory(index)} />
        )}
      />
      {viewerIndex !== null && (
        <StoryViewer
          stories={stories}
          initialIndex={viewerIndex}
          onClose={closeViewer}
          onStoryViewed={handleStoryViewed}
        />
      )}
    </>
  );
});

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: 12,
    paddingTop: 4,
    paddingBottom: 4,
    gap: 4,
  },
  item: {
    alignItems: "center",
    width: ITEM_WIDTH,
  },
  ring: {
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
  },
  innerRing: {
    width: RING_SIZE - 4,
    height: RING_SIZE - 4,
    borderRadius: (RING_SIZE - 4) / 2,
    alignItems: "center",
    justifyContent: "center",
  },
  avatar: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
  },
  badge: {
    position: "absolute",
    top: RING_SIZE - 14,
    alignSelf: "center",
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: "transparent",
  },
});
