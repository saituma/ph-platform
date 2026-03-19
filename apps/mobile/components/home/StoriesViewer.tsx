import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Image,
  Modal,
  PanResponder,
  Pressable,
  StatusBar,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AnimatedRe, {
  cancelAnimation,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { Text } from "@/components/ScaledText";
import { Feather } from "@/components/ui/theme-icons";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { VideoPlayer } from "@/components/media/VideoPlayer";
import * as Haptics from "expo-haptics";
import { prefetchStoryMedia } from "@/lib/story-media-prefetch";

export type StoryViewerItem = {
  id: string;
  title?: string | null;
  mediaUrl?: string | null;
  mediaType?: "image" | "video" | null;
  badge?: string | null;
};

type StoriesViewerProps = {
  visible: boolean;
  stories: StoryViewerItem[];
  initialIndex?: number;
  onClose: () => void;
};

const IMAGE_DURATION_MS = 6000;
const VIDEO_FALLBACK_MS = 9000;

export function StoriesViewer({
  visible,
  stories,
  initialIndex = 0,
  onClose,
}: StoriesViewerProps) {
  const { colors, isDark } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { width, height } = Dimensions.get("window");
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [barWidth, setBarWidth] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [videoDurations, setVideoDurations] = useState<Record<string, number>>({});
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.98)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const pauseOverlayAnim = useRef(new Animated.Value(0)).current;
  const pauseOverlayScale = useRef(new Animated.Value(0.96)).current;
  const progress = useSharedValue(0);

  const currentStory = stories[currentIndex] ?? null;
  const currentVideoDurationMs =
    currentStory?.mediaType === "video"
      ? videoDurations[currentStory?.id ?? ""] ?? 0
      : 0;
  const durationMs =
    currentStory?.mediaType === "video"
      ? currentVideoDurationMs || VIDEO_FALLBACK_MS
      : IMAGE_DURATION_MS;

  const handleClose = useCallback(() => {
    setIsPaused(false);
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 160,
      useNativeDriver: true,
    }).start(() => {
      translateY.setValue(0);
      onClose();
    });
  }, [fadeAnim, onClose, translateY]);

  const triggerHaptic = useCallback((style: Haptics.ImpactFeedbackStyle) => {
    if (process.env.EXPO_OS === "web") return;
    Haptics.impactAsync(style).catch(() => {});
  }, []);

  const handleNext = useCallback(() => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    if (currentIndex < stories.length - 1) {
      setCurrentIndex((prev) => Math.min(prev + 1, stories.length - 1));
    } else {
      handleClose();
    }
  }, [currentIndex, handleClose, stories.length, triggerHaptic]);

  const handlePrev = useCallback(() => {
    triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
    if (currentIndex > 0) {
      setCurrentIndex((prev) => Math.max(prev - 1, 0));
    } else {
      handleClose();
    }
  }, [currentIndex, handleClose, triggerHaptic]);

  useEffect(() => {
    if (!visible) return;
    setCurrentIndex(Math.min(Math.max(initialIndex, 0), Math.max(stories.length - 1, 0)));
  }, [initialIndex, stories.length, visible]);

  useEffect(() => {
    if (!visible) return;
    fadeAnim.setValue(0);
    scaleAnim.setValue(0.98);
    translateY.setValue(0);
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, scaleAnim, translateY, visible]);

  useEffect(() => {
    Animated.timing(pauseOverlayAnim, {
      toValue: isPaused ? 1 : 0,
      duration: 160,
      useNativeDriver: true,
    }).start();
    Animated.spring(pauseOverlayScale, {
      toValue: isPaused ? 1 : 0.96,
      useNativeDriver: true,
      damping: 16,
      stiffness: 180,
    }).start();
  }, [isPaused, pauseOverlayAnim, pauseOverlayScale]);

  const startProgress = useCallback(
    (fromValue = 0) => {
      if (!visible || !currentStory) return;
      if (currentStory.mediaType === "video" && currentVideoDurationMs <= 0) {
        cancelAnimation(progress);
        progress.value = 0;
        return;
      }
      cancelAnimation(progress);
      progress.value = fromValue;
      const remaining = Math.max(0, 1 - fromValue);
      const nextDuration = Math.max(200, durationMs * remaining);
      progress.value = withTiming(
        1,
        { duration: nextDuration },
        (finished) => {
          if (finished) {
            runOnJS(handleNext)();
          }
        }
      );
    },
    [currentStory, currentVideoDurationMs, durationMs, handleNext, progress, visible],
  );

  useEffect(() => {
    if (!visible) return;
    if (!currentStory) return;
    progress.value = 0;
    if (!isPaused && (currentStory.mediaType !== "video" || currentVideoDurationMs > 0)) {
      startProgress(0);
    } else {
      cancelAnimation(progress);
    }
    return () => cancelAnimation(progress);
  }, [currentIndex, currentStory, currentVideoDurationMs, isPaused, progress, startProgress, visible]);

  useEffect(() => {
    if (!visible || !currentStory) return;
    if (isPaused) return;
    if (currentStory.mediaType === "video" && currentVideoDurationMs <= 0) return;
    startProgress(progress.value);
  }, [currentStory, currentVideoDurationMs, durationMs, isPaused, progress, startProgress, visible]);

  useEffect(() => {
    if (!visible || stories.length === 0) return;
    void prefetchStoryMedia(stories, {
      startIndex: currentIndex,
      itemCount: 3,
      maxVideos: 1,
    });
  }, [currentIndex, stories, visible]);

  const currentTitle = currentStory?.title ?? "Story";
  const currentBadge = currentStory?.badge ?? null;
  const currentMediaUrl = currentStory?.mediaUrl ?? null;
  const isVideo = currentStory?.mediaType === "video";

  const progressStyle = useAnimatedStyle(
    () => ({
      width: barWidth * progress.value,
    }),
    [barWidth],
  );

  const containerStyle = useMemo(
    () => ({
      paddingTop: insets.top + 12,
      paddingBottom: insets.bottom + 18,
    }),
    [insets.bottom, insets.top]
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) =>
          Math.abs(gesture.dy) > 12 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
        onPanResponderGrant: () => {
          setIsPaused(true);
          cancelAnimation(progress);
        },
        onPanResponderMove: (_, gesture) => {
          if (gesture.dy > 0) {
            translateY.setValue(gesture.dy);
          }
        },
        onPanResponderRelease: (_, gesture) => {
          const shouldDismiss = gesture.dy > 140 || gesture.vy > 1.2;
          if (shouldDismiss) {
            triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
            Animated.timing(translateY, {
              toValue: height,
              duration: 200,
              useNativeDriver: true,
            }).start(() => handleClose());
          } else {
            Animated.timing(translateY, {
              toValue: 0,
              duration: 180,
              useNativeDriver: true,
            }).start(() => {
              setIsPaused(false);
              startProgress(progress.value);
            });
          }
        },
      }),
    [handleClose, height, progress, startProgress, translateY, triggerHaptic],
  );

  if (!visible || stories.length === 0) return null;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleClose}>
      <StatusBar barStyle="light-content" />
      <Animated.View
        style={[
          {
            flex: 1,
            backgroundColor: "#0B0E12",
            opacity: fadeAnim,
          },
        ]}
      >
        <Animated.View
          {...panResponder.panHandlers}
          style={{
            flex: 1,
            transform: [{ scale: scaleAnim }, { translateY }],
          }}
        >
          <View style={[{ flex: 1 }, containerStyle]}>
            <View
              className="flex-row items-center gap-2 px-4"
              onLayout={(event) => {
                if (!barWidth) {
                  const width = event.nativeEvent.layout.width;
                  setBarWidth(width / Math.max(stories.length, 1) - 8);
                }
              }}
            >
              {stories.map((story, index) => {
                const isActive = index === currentIndex;
                const fillWidth =
                  index < currentIndex ? barWidth : isActive ? undefined : 0;
                return (
                  <View
                    key={story.id}
                    style={{
                      flex: 1,
                      height: 3,
                      borderRadius: 999,
                      backgroundColor: "rgba(255,255,255,0.25)",
                      overflow: "hidden",
                      marginHorizontal: 4,
                    }}
                  >
                    {index < currentIndex ? (
                      <View
                        style={{
                          height: "100%",
                          width: "100%",
                          backgroundColor: "#FFFFFF",
                        }}
                      />
                    ) : index === currentIndex ? (
                      <AnimatedRe.View
                        style={[
                          {
                            height: "100%",
                            backgroundColor: "#FFFFFF",
                            width: fillWidth,
                          },
                          progressStyle,
                        ]}
                      />
                    ) : null}
                  </View>
                );
              })}
            </View>

            <View className="flex-row items-center justify-between px-4 pt-4">
              <View>
                <Text className="text-white font-clash text-lg">
                  {currentTitle}
                </Text>
                {currentBadge ? (
                  <View
                    className="mt-1 self-start rounded-full px-2 py-0.5"
                    style={{ backgroundColor: colors.accent }}
                  >
                    <Text className="text-[10px] font-outfit uppercase tracking-[1px] text-white">
                      {currentBadge}
                    </Text>
                  </View>
                ) : null}
              </View>
              <Pressable
                onPress={handleClose}
                className="h-10 w-10 items-center justify-center rounded-full bg-white/10"
              >
                <Feather name="x" size={18} color="#ffffff" />
              </Pressable>
            </View>

            <View className="flex-1 items-center justify-center px-4 pt-4">
              <View
                style={{
                  width: width - 32,
                  height: height - (insets.top + insets.bottom + 140),
                  borderRadius: 28,
                  overflow: "hidden",
                  backgroundColor: isDark ? "#0F1115" : "#0B0E12",
                }}
              >
                {currentMediaUrl ? (
                  isVideo ? (
                    <VideoPlayer
                      uri={currentMediaUrl}
                      height={height - (insets.top + insets.bottom + 140)}
                      autoPlay
                      initialMuted={false}
                      isLooping={false}
                      hideControls
                      hideTopChrome
                      contentFitOverride="cover"
                      ignoreTabFocus
                      showLoadingOverlay={false}
                      shouldPlay={visible && !isPaused}
                      isVisible={visible}
                      disableCache={false}
                      immersive
                      onDurationMs={(ms) => {
                        if (!currentStory?.id) return;
                        setVideoDurations((prev) =>
                          prev[currentStory.id] === ms
                            ? prev
                            : { ...prev, [currentStory.id]: ms },
                        );
                      }}
                      onEnded={() => {
                        if (!visible || isPaused) return;
                        handleNext();
                      }}
                    />
                  ) : (
                    <Image
                      source={{ uri: currentMediaUrl }}
                      resizeMode="cover"
                      style={{ width: "100%", height: "100%" }}
                    />
                  )
                ) : (
                  <View className="flex-1 items-center justify-center">
                    <Text className="text-sm text-white/60 font-outfit">
                      Story media unavailable
                    </Text>
                  </View>
                )}

                <Animated.View
                  pointerEvents="none"
                  style={{
                    position: "absolute",
                    inset: 0,
                    backgroundColor: "rgba(8,10,14,0.5)",
                    opacity: pauseOverlayAnim,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Animated.View
                    className="items-center gap-3 rounded-[24px] px-6 py-5"
                    style={{
                      backgroundColor: "rgba(255,255,255,0.08)",
                      borderWidth: 1,
                      borderColor: "rgba(255,255,255,0.16)",
                      transform: [{ scale: pauseOverlayScale }],
                    }}
                  >
                    <View
                      className="h-12 w-12 items-center justify-center rounded-full"
                      style={{
                        backgroundColor: "rgba(34,197,94,0.18)",
                        borderWidth: 1,
                        borderColor: "rgba(34,197,94,0.35)",
                      }}
                    >
                      <Feather name="pause" size={18} color="#ffffff" />
                    </View>
                    <Text className="text-xs font-outfit uppercase tracking-[2px] text-white">
                      Paused
                    </Text>
                    <Text className="text-[11px] font-outfit text-white/60">
                      Hold to keep paused
                    </Text>
                  </Animated.View>
                </Animated.View>
              </View>
            </View>

            <View className="flex-row items-center justify-between px-5 pb-4 pt-4">
              <Text className="text-xs text-white/60 font-outfit">
                {currentIndex + 1} / {stories.length}
              </Text>
              <Text className="text-xs text-white/60 font-outfit uppercase tracking-[2px]">
                Tap to navigate
              </Text>
            </View>
          </View>

          <Pressable
            onPress={handlePrev}
            onLongPress={() => {
              setIsPaused(true);
              triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
            }}
            onPressOut={() => {
              if (isPaused) {
                setIsPaused(false);
                startProgress(progress.value);
              }
            }}
            delayLongPress={160}
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              bottom: 0,
              width: "45%",
            }}
          />
          <Pressable
            onPress={handleNext}
            onLongPress={() => {
              setIsPaused(true);
              triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
            }}
            onPressOut={() => {
              if (isPaused) {
                setIsPaused(false);
                startProgress(progress.value);
              }
            }}
            delayLongPress={160}
            style={{
              position: "absolute",
              right: 0,
              top: 0,
              bottom: 0,
              width: "55%",
            }}
          />
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}
