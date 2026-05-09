import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Dimensions,
  Modal,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { Image } from "expo-image";
import { useVideoPlayer, VideoView } from "expo-video";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import { X } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { Text } from "@/components/ScaledText";
import type { Story } from "@/hooks/useStories";

const { width: SCREEN_W } = Dimensions.get("window");
const STORY_DURATION = 6000;

type Props = {
  stories: Story[];
  initialIndex: number;
  onClose: () => void;
  onStoryViewed?: (storyId: number) => void;
};

function ProgressBar({
  index,
  activeIndex,
  progress,
}: {
  index: number;
  activeIndex: number;
  progress: SharedValue<number>;
}) {
  const fillStyle = useAnimatedStyle(() => {
    if (index < activeIndex) return { flex: 1 };
    if (index > activeIndex) return { flex: 0 };
    return { flex: progress.value };
  });

  return (
    <View style={progressStyles.track}>
      <Animated.View style={[progressStyles.fill, fillStyle]} />
    </View>
  );
}

const progressStyles = StyleSheet.create({
  track: {
    flex: 1,
    height: 2.5,
    backgroundColor: "rgba(255,255,255,0.35)",
    borderRadius: 2,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    backgroundColor: "#fff",
    borderRadius: 2,
  },
});

function StoryVideoContent({
  uri,
  onEnded,
}: {
  uri: string;
  onEnded: () => void;
}) {
  const player = useVideoPlayer(uri, (p) => {
    p.play();
  });

  useEffect(() => {
    const sub = player.addListener("statusChange", (e) => {
      if (e.status === "idle" && e.oldStatus === "readyToPlay") {
        onEnded();
      }
    });
    return () => sub.remove();
  }, [player, onEnded]);

  return (
    <VideoView
      player={player}
      style={StyleSheet.absoluteFill}
      contentFit="cover"
      nativeControls={false}
    />
  );
}

export function StoryViewer({ stories, initialIndex, onClose, onStoryViewed }: Props) {
  const insets = useSafeAreaInsets();
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const progress = useSharedValue(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const story = stories[activeIndex];

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const goNext = useCallback(() => {
    clearTimer();
    if (activeIndex < stories.length - 1) {
      progress.value = 0;
      setActiveIndex((i) => i + 1);
    } else {
      onClose();
    }
  }, [activeIndex, stories.length, clearTimer, onClose, progress]);

  const goPrev = useCallback(() => {
    clearTimer();
    progress.value = 0;
    if (activeIndex > 0) {
      setActiveIndex((i) => i - 1);
    }
  }, [activeIndex, clearTimer, progress]);

  const startProgress = useCallback(() => {
    if (story?.mediaType === "video") return;
    progress.value = 0;
    progress.value = withTiming(1, {
      duration: STORY_DURATION,
      easing: Easing.linear,
    });
    clearTimer();
    timerRef.current = setTimeout(goNext, STORY_DURATION);
  }, [story, progress, clearTimer, goNext]);

  useEffect(() => {
    startProgress();
    if (story && !story.viewed) {
      onStoryViewed?.(story.id);
    }
    return clearTimer;
  }, [activeIndex, startProgress, clearTimer, story, onStoryViewed]);

  const handlePress = useCallback(
    (locationX: number) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      if (locationX < SCREEN_W / 3) {
        goPrev();
      } else {
        goNext();
      }
    },
    [goPrev, goNext],
  );

  const handleVideoEnd = useCallback(() => {
    goNext();
  }, [goNext]);

  const handleLongPressIn = useCallback(() => {
    clearTimer();
  }, [clearTimer]);

  const handleLongPressOut = useCallback(() => {
    startProgress();
  }, [startProgress]);

  if (!story) return null;

  return (
    <Modal
      visible
      animationType="fade"
      presentationStyle="fullScreen"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {story.mediaType === "video" ? (
          <StoryVideoContent uri={story.mediaUrl} onEnded={handleVideoEnd} />
        ) : (
          <Image
            source={{ uri: story.mediaUrl }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={200}
          />
        )}

        <View
          style={[styles.overlay, { paddingTop: insets.top + 8 }]}
          pointerEvents="box-none"
        >
          <View style={styles.progressRow}>
            {stories.map((s, i) => (
              <ProgressBar
                key={s.id}
                index={i}
                activeIndex={activeIndex}
                progress={progress}
              />
            ))}
          </View>

          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text
                style={{
                  fontFamily: "Outfit-Bold",
                  fontSize: 15,
                  color: "#fff",
                }}
              >
                {story.title}
              </Text>
              {story.badge ? (
                <View style={styles.headerBadge}>
                  <Text
                    style={{
                      fontFamily: "Outfit-Bold",
                      fontSize: 10,
                      color: "#fff",
                      textTransform: "uppercase",
                    }}
                  >
                    {story.badge}
                  </Text>
                </View>
              ) : null}
            </View>
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onClose();
              }}
              hitSlop={16}
            >
              <X size={28} color="#fff" />
            </Pressable>
          </View>
        </View>

        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={(e) => handlePress(e.nativeEvent.locationX)}
          onLongPress={handleLongPressIn}
          onPressOut={handleLongPressOut}
          delayLongPress={200}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  progressRow: {
    flexDirection: "row",
    gap: 4,
    paddingHorizontal: 8,
    marginBottom: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  headerBadge: {
    backgroundColor: "rgba(255,255,255,0.25)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
});
