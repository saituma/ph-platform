import React, { memo, useCallback, useEffect, useRef, useState, forwardRef, useImperativeHandle } from "react";
import {
  View,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  useWindowDimensions,
  AppState,
  AppStateStatus,
  BackHandler,
} from "react-native";
import { Image } from "expo-image";
import { useVideoPlayer, VideoView } from "expo-video";
import YoutubeIframe from "react-native-youtube-iframe";
import { WebView } from "react-native-webview";
import type { VideoView as ExpoVideoView } from "expo-video";
import Animated, {
  FadeIn,
  FadeOut,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  useReducedMotion,
  Easing,
  withRepeat,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Text } from "@/components/ScaledText";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { upsertWatchEntry } from "@/lib/mmkv";

// ── Source Detection ─────────────────────────────────────────────────

type SourceType = "local" | "youtube" | "loom";

function detectSourceType(source: string | number): SourceType {
  if (typeof source === "number") return "local"; // require(...)
  if (source.includes("youtube.com") || source.includes("youtu.be"))
    return "youtube";
  if (source.includes("loom.com")) return "loom";
  return "local";
}

function extractYouTubeId(url: string): string | null {
  const match = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/,
  );
  return match ? match[1] : null;
}

function extractLoomEmbedUrl(url: string): string {
  const id = url.split("/share/")[1]?.split("?")[0] ?? "";
  return `https://www.loom.com/embed/${id}`;
}

// ── Props ────────────────────────────────────────────────────────────

export interface VideoPlayerProps {
  source: string | number;
  title?: string;
  thumbnail?: string;
  autoPlay?: boolean;
  videoId?: string; // for watch history tracking
  durationSec?: number;
}

export interface VideoPlayerRef {
  enterFullscreen?: () => void;
  exitFullscreen?: () => void;
}

// ── Skeleton Shimmer ────────────────────────────────────────────────

const Shimmer = memo(function Shimmer() {
  const opacity = useSharedValue(0.3);
  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(0.7, { duration: 800, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [opacity]);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return <Animated.View style={[StyleSheet.absoluteFill, styles.shimmer, style]} />;
});

// ── Main Component ───────────────────────────────────────────────────

const VideoPlayer = memo(forwardRef<VideoPlayerRef, VideoPlayerProps>(function VideoPlayer({
  source,
  title,
  thumbnail,
  autoPlay = false,
  videoId,
  durationSec = 0,
}: VideoPlayerProps, ref) {
  const { width } = useWindowDimensions();
  const { colors, isDark } = useAppTheme();
  const reduceMotion = useReducedMotion();
  const sourceType = detectSourceType(source);

  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [isReady, setIsReady] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [aspectRatio, setAspectRatio] = useState(16 / 9);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const controlTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const innerPlayerRef = useRef<VideoPlayerRef>(null);

  useImperativeHandle(ref, () => ({
    enterFullscreen: () => {
      innerPlayerRef.current?.enterFullscreen?.();
    },
    exitFullscreen: () => {
      innerPlayerRef.current?.exitFullscreen?.();
    }
  }));

  const maxContainerHeight = width * 1.5;
  const computedHeight = Math.round(width / aspectRatio);
  const containerHeight = Math.min(computedHeight, maxContainerHeight);

  // ── Control visibility ────────────────────────────────────────────
  const controlsOpacity = useSharedValue(1);
  const controlsAnimStyle = useAnimatedStyle(() => ({
    opacity: controlsOpacity.value,
  }));

  const resetControlTimer = useCallback(() => {
    if (controlTimer.current) clearTimeout(controlTimer.current);
    controlsOpacity.value = withTiming(1, { duration: 150 });
    setShowControls(true);
    controlTimer.current = setTimeout(() => {
      if (isPlaying) {
        controlsOpacity.value = withTiming(0, { duration: 300 });
        setShowControls(false);
      }
    }, 3000);
  }, [isPlaying, controlsOpacity]);

  // ── Play / Pause ──────────────────────────────────────────────────
  const handlePlayPause = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsPlaying((prev) => !prev);
    resetControlTimer();
  }, [resetControlTimer]);

  // ── Tap container to toggle controls ──────────────────────────────
  const handleTapContainer = useCallback(() => {
    if (!isPlaying) return;
    if (showControls) {
      controlsOpacity.value = withTiming(0, { duration: 300 });
      setShowControls(false);
    } else {
      resetControlTimer();
    }
  }, [isPlaying, showControls, controlsOpacity, resetControlTimer]);

  const handleFullscreen = useCallback(() => {
    innerPlayerRef.current?.enterFullscreen?.();
  }, []);

  // ── Background pause ──────────────────────────────────────────────
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state: AppStateStatus) => {
      if (state !== "active" && isPlaying) setIsPlaying(false);
    });
    return () => sub.remove();
  }, [isPlaying]);

  // ── Android Fullscreen Back Handler ───────────────────────────────
  useEffect(() => {
    if (isFullscreen) {
      const sub = BackHandler.addEventListener("hardwareBackPress", () => {
        innerPlayerRef.current?.exitFullscreen?.();
        return true; // prevent router from consuming back native
      });
      return () => sub.remove();
    }
  }, [isFullscreen]);

  // ── Watch history progress ────────────────────────────────────────
  useEffect(() => {
    if (!isPlaying || !videoId) return;
    progressInterval.current = setInterval(() => {
      // progress is tracked by total elapsed time vs duration
      upsertWatchEntry({
        videoId: videoId!,
        title: title ?? "",
        thumbnail: typeof source === "string" ? thumbnail : undefined,
        progress: 0, // in a real implementation, track actual player position
        durationSec,
        lastWatched: Date.now(),
      });
    }, 10_000);
    return () => {
      if (progressInterval.current) clearInterval(progressInterval.current);
    };
  }, [isPlaying, videoId, title, source, thumbnail, durationSec]);

  // ── Error state ───────────────────────────────────────────────────
  if (hasError) {
    return (
      <View style={[styles.container, { height: containerHeight, backgroundColor: isDark ? "#1A1A1A" : "#F2F2F7" }]}>
        <Ionicons name="alert-circle-outline" size={40} color={colors.textSecondary} />
        <Text style={[styles.errorText, { fontFamily: "Outfit-Regular", color: colors.textSecondary }]}>
          Unable to load video
        </Text>
        <Pressable
          onPress={() => { setHasError(false); setIsReady(false); }}
          style={[styles.retryBtn, { backgroundColor: colors.accent }]}
          accessibilityLabel="Retry loading video"
        >
          <Text style={[styles.retryText, { fontFamily: "Outfit-Medium", color: colors.textInverse }]}>
            Retry
          </Text>
        </Pressable>
      </View>
    );
  }

  const showPoster = !isPlaying && !autoPlay;

  // For local sources, keep the player mounted during the poster phase so the
  // video buffers in the background while the user sees the thumbnail.
  const preloadLocal = sourceType === "local" && !autoPlay;

  // ── Unified render (poster + active share the same tree for local) ──
  return (
    <Pressable
      onPress={showPoster ? undefined : handleTapContainer}
      style={[
        styles.container,
        { height: containerHeight, backgroundColor: showPoster ? (isDark ? "#111111" : "#E5E5EA") : "#000" },
      ]}
    >
      {/* Local player: always mounted when preloadLocal so buffering starts early */}
      {(preloadLocal || (!showPoster && sourceType === "local")) && (
        <LocalPlayer
          ref={innerPlayerRef}
          source={source as number | string}
          isPlaying={isPlaying}
          onPlayingChange={setIsPlaying}
          onFullscreenEnter={() => setIsFullscreen(true)}
          onFullscreenExit={() => setIsFullscreen(false)}
          onReady={() => setIsReady(true)}
          onError={() => setHasError(true)}
          onAspectRatioDetected={setAspectRatio}
        />
      )}

      {/* Poster overlay: sits on top of the pre-buffering player */}
      {showPoster && (
        <View style={[StyleSheet.absoluteFill, { borderRadius: 16, overflow: "hidden" }]}>
          {thumbnail ? (
            <Image
              source={{ uri: thumbnail }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              cachePolicy="memory-disk"
              placeholder={{ blurhash: "L6PZfSi_.AyE_3t7t7R**0o#DgR4" }}
            />
          ) : (
            <Shimmer />
          )}

          {title ? (
            <View style={styles.titleOverlay}>
              <Text style={[styles.titleText, { fontFamily: "Outfit-Medium" }]} numberOfLines={2}>
                {title}
              </Text>
            </View>
          ) : null}

          {durationSec > 0 ? (
            <View style={styles.durationChip}>
              <Text style={[styles.durationText, { fontFamily: "Outfit-Medium" }]}>
                {formatDuration(durationSec)}
              </Text>
            </View>
          ) : null}

          <Pressable
            onPress={handlePlayPause}
            style={styles.playBtn}
            accessibilityLabel="Play video"
            accessibilityRole="button"
          >
            <View style={styles.playCircle}>
              <Ionicons name="play" size={32} color="#FFFFFF" style={{ marginLeft: 4 }} />
            </View>
          </Pressable>
        </View>
      )}

      {/* Non-local players: only mount when active */}
      {!showPoster && sourceType === "youtube" && (
        <YouTubePlayer
          videoId={extractYouTubeId(source as string) ?? ""}
          isPlaying={isPlaying}
          onReady={() => setIsReady(true)}
          onError={() => setHasError(true)}
          height={containerHeight}
        />
      )}
      {!showPoster && sourceType === "loom" && (
        <LoomPlayer
          url={extractLoomEmbedUrl(source as string)}
          height={containerHeight}
          onReady={() => setIsReady(true)}
          onError={() => setHasError(true)}
        />
      )}

      {/* Loading shimmer while active and not ready */}
      {!showPoster && !isReady && <Shimmer />}

      {/* Controls overlay */}
      {!showPoster && showControls && (
        <Animated.View
          style={[styles.controlsOverlay, controlsAnimStyle]}
          entering={reduceMotion ? undefined : FadeIn.duration(150)}
          exiting={reduceMotion ? undefined : FadeOut.duration(300)}
        >
          <View style={styles.controlBar}>
            <Pressable onPress={handlePlayPause} accessibilityLabel={isPlaying ? "Pause" : "Play"}>
              <Ionicons name={isPlaying ? "pause" : "play"} size={28} color="#FFF" />
            </Pressable>
            {title ? (
              <Text style={[styles.controlTitle, { fontFamily: "Outfit-Regular" }]} numberOfLines={1}>
                {title}
              </Text>
            ) : null}
            {sourceType === "local" && (
              <Pressable onPress={handleFullscreen} accessibilityLabel="Fullscreen" style={{ paddingLeft: 8 }}>
                <Ionicons name="expand" size={24} color="#FFF" />
              </Pressable>
            )}
          </View>
        </Animated.View>
      )}
    </Pressable>
  );
}));

export default VideoPlayer;

// ── Sub-players ──────────────────────────────────────────────────────

const LocalPlayer = memo(forwardRef<VideoPlayerRef, {
  source: number | string;
  isPlaying: boolean;
  onPlayingChange: (playing: boolean) => void;
  onFullscreenEnter: () => void;
  onFullscreenExit: () => void;
  onReady: () => void;
  onError: () => void;
  onAspectRatioDetected: (ratio: number) => void;
}>(function LocalPlayer({
  source,
  isPlaying,
  onPlayingChange,
  onFullscreenEnter,
  onFullscreenExit,
  onReady,
  onError,
  onAspectRatioDetected,
}, ref) {
  const videoSource = typeof source === "number" ? source : { uri: source };
  const player = useVideoPlayer(videoSource as any, (p) => {
    p.loop = false;
  });
  
  const videoViewRef = useRef<ExpoVideoView>(null);

  useImperativeHandle(ref, () => ({
    enterFullscreen: () => {
      videoViewRef.current?.enterFullscreen();
    },
    exitFullscreen: () => {
      videoViewRef.current?.exitFullscreen();
    }
  }));

  useEffect(() => {
    if (isPlaying && !player.playing) {
      player.play();
    } else if (!isPlaying && player.playing) {
      player.pause();
    }
  }, [isPlaying, player]);

  useEffect(() => {
    const sub = player.addListener("playingChange", (payload: any) => {
      onPlayingChange(payload.isPlaying);
    });
    return () => sub.remove();
  }, [player, onPlayingChange]);

  useEffect(() => {
    const handleTracks = () => {
      try {
        const tracks = player.availableVideoTracks;
        if (tracks && tracks.length > 0) {
           const track = tracks[0];
           const size = (track as any).size ?? track;
           if (size?.width && size?.height) {
              onAspectRatioDetected(size.width / size.height);
           }
        }
      } catch (e) {}
    };

    const sub = player.addListener("statusChange", (status: any) => {
      if (status.status === "readyToPlay") {
        onReady();
        handleTracks();
      }
      if (status.status === "error") onError();
    });
    
    // Also try immediately in case it's cached or local
    handleTracks();

    return () => sub.remove();
  }, [player, onReady, onError, onAspectRatioDetected]);

  return (
    <VideoView
      ref={videoViewRef}
      player={player}
      style={StyleSheet.absoluteFill}
      nativeControls={false}
      showsTimecodes={false}
      onFullscreenEnter={onFullscreenEnter}
      onFullscreenExit={onFullscreenExit}
      contentFit="cover"
    />
  );
}));

const YouTubePlayer = memo(function YouTubePlayer({
  videoId,
  isPlaying,
  onReady,
  onError,
  height,
}: {
  videoId: string;
  isPlaying: boolean;
  onReady: () => void;
  onError: () => void;
  height: number;
}) {
  return (
    <YoutubeIframe
      videoId={videoId}
      height={height}
      play={isPlaying}
      onReady={onReady}
      onError={onError}
      webViewProps={{ renderToHardwareTextureAndroid: true }}
      webViewStyle={styles.webView}
    />
  );
});

const LoomPlayer = memo(function LoomPlayer({
  url,
  height,
  onReady,
  onError,
}: {
  url: string;
  height: number;
  onReady: () => void;
  onError: () => void;
}) {
  return (
    <WebView
      source={{ uri: url }}
      style={[styles.webView, { height }]}
      onLoad={onReady}
      onError={onError}
      allowsInlineMediaPlayback
      mediaPlaybackRequiresUserAction={false}
      renderToHardwareTextureAndroid
      javaScriptEnabled
    />
  );
});

// ── Helpers ──────────────────────────────────────────────────────────

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// ── Styles ───────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    width: "100%",
    borderRadius: 16,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  shimmer: {
    backgroundColor: "#1E1E1E",
    borderRadius: 16,
  },
  titleOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingBottom: 44,
    paddingTop: 24,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  titleText: {
    fontSize: 16,
    color: "#FFFFFF",
    fontWeight: "500",
  },
  durationChip: {
    position: "absolute",
    bottom: 12,
    right: 12,
    backgroundColor: "#111111",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  durationText: {
    fontSize: 11,
    color: "#FFFFFF",
    fontWeight: "500",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  playBtn: {
    position: "absolute",
    justifyContent: "center",
    alignItems: "center",
  },
  playCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
  },
  controlsOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "flex-end",
  },
  controlBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  controlTitle: {
    flex: 1,
    fontSize: 15,
    color: "#FFFFFF",
  },
  errorText: {
    fontSize: 15,
    marginTop: 12,
    textAlign: "center",
  },
  retryBtn: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
  },
  retryText: {
    fontSize: 15,
  },
  webView: {
    width: "100%",
    backgroundColor: "transparent",
  },
});
