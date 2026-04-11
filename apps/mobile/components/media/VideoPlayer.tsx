import React, {
  useState,
  useRef,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import {
  View,
  Pressable,
  Animated,
  AppState,
  Image,
  Linking,
  Dimensions,
  Modal,
  Platform,
} from "react-native";
import { VideoView } from "expo-video";
import { useIsFocused } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import { WebView } from "react-native-webview";
import { Text } from "@/components/ScaledText";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { useVideoCache } from "@/hooks/useVideoCache";
import { useActiveTab } from "@/context/ActiveTabContext";
import { useVideoPlaybackController } from "./VideoPlaybackController";

import {
  YouTubeEmbed,
  isYoutubeUrl,
  normalizeUrl,
  YouTubeEmbedHandle,
} from "./video/YouTubeEmbed";
import { VideoPoster } from "./video/VideoPoster";
import { VideoLoadingOverlay } from "./video/VideoLoadingOverlay";
import { VideoControls } from "./video/VideoControls";
import { useVideoPlayerEngine } from "../../hooks/media/useVideoPlayerEngine";

export { YouTubeEmbed, isYoutubeUrl, normalizeUrl, YouTubeEmbedHandle };

function isYoutubeShortsUrl(url: string): boolean {
  const raw = normalizeUrl(url);
  if (!raw) return false;
  try {
    const u = new URL(raw);
    const host = u.hostname.toLowerCase();
    // Shorts are only reliably identifiable by the pathname, not by query params like `feature=shorts`.
    const isYoutubeHost =
      host === "youtube.com" ||
      host === "www.youtube.com" ||
      host === "m.youtube.com" ||
      host.endsWith(".youtube.com");
    if (!isYoutubeHost) return false;
    return u.pathname.toLowerCase().startsWith("/shorts/");
  } catch {
    // Fallback: only match actual path segment, not `feature=shorts` etc.
    return /(^|\/)shorts\/[A-Za-z0-9_-]{6,}/i.test(raw);
  }
}

interface VideoPlayerProps {
  uri: string;
  height?: number;
  autoPlay?: boolean;
  initialMuted?: boolean;
  isLooping?: boolean;
  useVideoResolution?: boolean;
  controllerKey?: string;
  maxHeightRatio?: number;
  showLoadingOverlay?: boolean;
  ignoreTabFocus?: boolean;
  contentFitOverride?: "cover" | "contain";
  previewOnly?: boolean;
  onPreviewPress?: () => void;
  hideTopChrome?: boolean;
  hideControls?: boolean;
  disableCache?: boolean;
  cacheKey?: string;
  hideCenterControls?: boolean;
  posterUri?: string | null;
  immersive?: boolean;
  cinematic?: boolean;
  shouldPlay?: boolean;
  title?: string;
  initialAspectRatio?: number;
  isVisible?: boolean;
  pauseOthers?: () => void;
  onDurationMs?: (durationMs: number) => void;
  onEnded?: () => void;
}

export function VideoPlayer({
  uri,
  height = 220,
  autoPlay = false,
  initialMuted = true,
  isLooping = true,
  useVideoResolution = true,
  controllerKey,
  maxHeightRatio = 1,
  showLoadingOverlay = true,
  ignoreTabFocus = false,
  contentFitOverride,
  previewOnly = false,
  onPreviewPress,
  hideTopChrome = false,
  hideControls = false,
  disableCache = false,
  cacheKey,
  hideCenterControls = false,
  posterUri,
  immersive = false,
  cinematic = false,
  shouldPlay: propShouldPlay = true,
  title,
  initialAspectRatio,
  isVisible = true,
  pauseOthers,
  onDurationMs,
  onEnded,
}: VideoPlayerProps) {
  const { colors, isDark } = useAppTheme();
  const navFocused = useIsFocused();
  const { activeTabIndex, currentTabIndex } = useActiveTab();
  const isTabActive = activeTabIndex === currentTabIndex;
  const playbackController = useVideoPlaybackController();
  const [fullscreenOpen, setFullscreenOpen] = useState(false);
  const inlineYouTubeRef = useRef<YouTubeEmbedHandle | null>(null);
  const modalYouTubeRef = useRef<YouTubeEmbedHandle | null>(null);
  const [youtubeIsPlaying, setYoutubeIsPlaying] = useState(false);
  const [youtubeResumeTime, setYoutubeResumeTime] = useState(0);

  const [appActive, setAppActive] = useState(
    AppState.currentState === "active",
  );

  const effectiveShouldPlay =
    propShouldPlay &&
    (ignoreTabFocus || (navFocused && isTabActive)) &&
    appActive &&
    isVisible;

  const normalizedUri = normalizeUrl(uri);
  const isYoutube = isYoutubeUrl(normalizedUri);
  const enableYoutubeShortsAspect =
    process.env.EXPO_PUBLIC_ENABLE_YOUTUBE_SHORTS_ASPECT === "1" ||
    process.env.EXPO_PUBLIC_ENABLE_YOUTUBE_SHORTS_ASPECT === "true";
  const isYoutubeShorts =
    enableYoutubeShortsAspect && isYoutube && isYoutubeShortsUrl(normalizedUri);
  const isLoom = /loom\.com/i.test(normalizedUri);
  const loomEmbedUrl = useMemo(() => {
    if (!isLoom) return null;
    const match = normalizedUri.match(
      /loom\.com\/(share|embed)\/([A-Za-z0-9]+)/i,
    );
    const id = match?.[2] ?? null;
    return id ? `https://www.loom.com/embed/${id}` : normalizedUri;
  }, [isLoom, normalizedUri]);
  const { cachedUri } = useVideoCache(
    disableCache || isYoutube || isLoom ? null : normalizedUri,
    cacheKey,
  );
  const finalUri = disableCache ? normalizedUri : cachedUri || normalizedUri;
  const sourceForPlayer =
    (finalUri && typeof finalUri === "string" ? finalUri : normalizedUri) || "";

  const fadeAnim = useRef(new Animated.Value(0)).current;

  const {
    player,
    isPlaying,
    isMuted,
    isLoading,
    isBuffering,
    error,
    duration,
    position,
    resolution,
    aspectRatio,
    safePause,
    safePlay,
    toggleMute,
  } = useVideoPlayerEngine({
    sourceUri: sourceForPlayer,
    autoPlay,
    initialMuted,
    isLooping,
    effectiveShouldPlay,
    isVisible,
    onDurationMs,
    onEnded,
    fadeAnim,
  });

  const videoRef = useRef<VideoView>(null);
  const { width: screenWidth, height: screenHeight } = Dimensions.get("window");
  const [containerWidth, setContainerWidth] = useState<number | null>(null);

  useEffect(() => {
    if (!playbackController || !controllerKey) return;
    return playbackController.register(controllerKey, safePause);
  }, [controllerKey, playbackController, safePause]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (next) => {
      setAppActive(next === "active");
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (ignoreTabFocus) return;
    if (!effectiveShouldPlay || !isVisible) {
      safePause();
    } else if (autoPlay) {
      if (pauseOthers) pauseOthers();
      if (playbackController && controllerKey)
        playbackController.pauseOthers(controllerKey);
      safePlay();
    }
  }, [
    ignoreTabFocus,
    effectiveShouldPlay,
    isVisible,
    autoPlay,
    pauseOthers,
    safePause,
    safePlay,
    playbackController,
    controllerKey,
  ]);

  useEffect(() => {
    if (posterUri && !aspectRatio) {
      Image.getSize(
        posterUri,
        (w, h) => {},
        () => {},
      );
    }
  }, [posterUri, aspectRatio]);

  const togglePlay = () => {
    if (error) {
      Linking.openURL(finalUri).catch(() => {});
      return;
    }
    if (isPlaying) safePause();
    else {
      if (pauseOthers) pauseOthers();
      if (playbackController && controllerKey)
        playbackController.pauseOthers(controllerKey);
      safePlay();
    }
  };

  const progress = duration > 0 ? Math.min(1, position / duration) : 0;
  const fitMode = contentFitOverride ?? "contain";
  const youtubeDetectedAspectRatio = isYoutubeShorts ? 9 / 16 : null;
  // For YouTube/Loom we don't control the media pipeline (iframe/webview).
  // expo-video metadata can be missing or misleading for those URLs, so don't let it
  // drive the container sizing.
  const effectiveAspectRatio =
    isYoutube || isLoom
      ? youtubeDetectedAspectRatio ?? initialAspectRatio ?? 16 / 9
      : aspectRatio ?? initialAspectRatio ?? 16 / 9;
  const effectiveMaxHeightRatio =
    effectiveAspectRatio > 0 && effectiveAspectRatio < 1
      ? Math.max(maxHeightRatio, 0.9)
      : maxHeightRatio;

  const containerSize = useMemo(() => {
    const ratio = effectiveAspectRatio > 0 ? effectiveAspectRatio : 16 / 9;
    const w = containerWidth ?? screenWidth;
    const naturalH = w / ratio;
    const maxH =
      screenHeight * Math.max(0.5, Math.min(1, effectiveMaxHeightRatio));
    return { width: w, height: Math.min(naturalH, maxH) };
  }, [
    containerWidth,
    effectiveAspectRatio,
    effectiveMaxHeightRatio,
    screenHeight,
    screenWidth,
  ]);

  const resolvedHeight = useVideoResolution ? containerSize.height : height;

  const onContainerLayout = useCallback((e: any) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0) setContainerWidth(w);
  }, []);

  const showPoster = !isPlaying && position < 0.5 && !error && !previewOnly;
  const rotation = screenWidth < screenHeight ? "90deg" : "0deg";
  const fullscreenWidth = Math.max(screenWidth, screenHeight);
  const fullscreenHeight = Math.min(screenWidth, screenHeight);

  const openFullscreen = useCallback(() => {
    if (!isYoutube) {
      Linking.openURL(finalUri).catch(() => {});
      return;
    }
    (async () => {
      const t = await inlineYouTubeRef.current?.getCurrentTime();
      setYoutubeResumeTime(typeof t === "number" ? t : 0);
      if (pauseOthers) pauseOthers();
      if (playbackController && controllerKey)
        playbackController.pauseOthers(controllerKey);
      setFullscreenOpen(true);
    })();
  }, [controllerKey, finalUri, isYoutube, pauseOthers, playbackController]);

  const closeFullscreen = useCallback(() => {
    (async () => {
      const t = await modalYouTubeRef.current?.getCurrentTime();
      setYoutubeResumeTime(typeof t === "number" ? t : 0);
      setFullscreenOpen(false);
      setTimeout(() => {
        inlineYouTubeRef.current?.seekTo(typeof t === "number" ? t : 0);
      }, 50);
    })();
  }, []);

  if (error && !isYoutube && !isLoom) {
    return (
      <Pressable
        onPress={() => Linking.openURL(finalUri)}
        style={{
          flex: 1,
          backgroundColor: "#000",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Text style={{ color: "white" }}>{error}</Text>
        <Feather
          name="external-link"
          size={24}
          color="white"
          style={{ marginTop: 12 }}
        />
      </Pressable>
    );
  }

  return (
    <View
      onLayout={onContainerLayout}
      style={{
        width: "100%",
        height: resolvedHeight,
        backgroundColor: "#000",
        overflow: "hidden",
        borderRadius: immersive || cinematic ? 0 : 24,
        borderWidth: immersive || cinematic ? 0 : 1,
        borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)",
      }}
    >
      {isYoutube ? (
        <YouTubeEmbed
          ref={inlineYouTubeRef as any}
          url={uri}
          width={containerSize.width}
          height={resolvedHeight}
          shouldPlay={
            !fullscreenOpen && effectiveShouldPlay && youtubeIsPlaying
          }
          initialMuted={initialMuted}
          onPlayerStateChange={(state: string) => {
            if (fullscreenOpen) return;
            if (state === "playing") setYoutubeIsPlaying(true);
            if (state === "paused" || state === "ended")
              setYoutubeIsPlaying(false);
          }}
        />
      ) : isLoom ? (
        <WebView
          source={loomEmbedUrl ? { uri: loomEmbedUrl } : { uri: normalizedUri }}
          style={{ flex: 1, backgroundColor: "#000" }}
          allowsFullscreenVideo
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction
          scrollEnabled={false}
          originWhitelist={["https://*", "http://*"]}
        />
      ) : (
        <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
          <VideoView
            ref={videoRef}
            player={player}
            style={{ flex: 1 }}
            contentFit={fitMode}
            nativeControls={ignoreTabFocus}
            allowsPictureInPicture
            {...(Platform.OS === "android"
              ? { surfaceType: "textureView" }
              : {})}
          />
        </Animated.View>
      )}

      {!isYoutube && !ignoreTabFocus && showPoster && (
        <VideoPoster
          posterUri={posterUri}
          onPress={togglePlay}
          previewOnly={previewOnly}
          onPreviewPress={onPreviewPress}
        />
      )}

      {!isYoutube && showLoadingOverlay && (
        <VideoLoadingOverlay
          isLoading={isLoading}
          isBuffering={isBuffering}
          accentColor={colors.accent}
        />
      )}

      {!isYoutube && !ignoreTabFocus && !cinematic && !showPoster && (
        <VideoControls
          isPlaying={isPlaying}
          isMuted={isMuted}
          position={position}
          duration={duration}
          progress={progress}
          accentColor={colors.accent}
          hideCenterControls={hideCenterControls}
          hideControls={hideControls}
          togglePlay={togglePlay}
          toggleMute={toggleMute}
          openFullscreen={openFullscreen}
        />
      )}

      {!ignoreTabFocus && !hideTopChrome && (
        <View
          style={{
            position: "absolute",
            top: 12,
            left: 12,
            right: 12,
            flexDirection: "row",
            justifyContent: "space-between",
            zIndex: 30,
          }}
        >
          {resolution && !isYoutube && !isLoom && (
            <View
              style={{
                backgroundColor: "rgba(0,0,0,0.6)",
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 20,
              }}
            >
              <Text style={{ color: "white", fontSize: 12 }}>
                {`${resolution.width}×${resolution.height}`}
              </Text>
            </View>
          )}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            {title && (
              <Text
                style={{
                  color: "white",
                  fontSize: 14,
                  backgroundColor: "rgba(0,0,0,0.6)",
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 20,
                }}
              >
                {title}
              </Text>
            )}
            {isYoutube && (
              <Pressable
                onPress={openFullscreen}
                style={{
                  backgroundColor: "rgba(0,0,0,0.6)",
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 20,
                }}
              >
                <Feather name="maximize" size={18} color="#fff" />
              </Pressable>
            )}
          </View>
        </View>
      )}

      <Modal
        visible={fullscreenOpen}
        animationType="fade"
        onRequestClose={closeFullscreen}
        supportedOrientations={["portrait", "landscape"]}
      >
        <View style={{ flex: 1, backgroundColor: "#000" }}>
          <Pressable
            onPress={closeFullscreen}
            style={{
              position: "absolute",
              top: 18,
              right: 18,
              zIndex: 10,
              backgroundColor: "rgba(0,0,0,0.55)",
              borderRadius: 999,
              padding: 10,
            }}
          >
            <Feather name="x" size={22} color="#fff" />
          </Pressable>

          <View
            style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
          >
            <View
              style={{
                width: fullscreenWidth,
                height: fullscreenHeight,
                transform: [{ rotate: rotation }],
              }}
            >
              <YouTubeEmbed
                ref={modalYouTubeRef as any}
                url={uri}
                shouldPlay={youtubeIsPlaying}
                initialMuted={initialMuted}
                // Fullscreen sizing is explicit; keep the player locked to the rotated container.
                width={fullscreenWidth}
                height={fullscreenHeight}
                onPlayerReady={() => {
                  if (youtubeResumeTime > 0) {
                    modalYouTubeRef.current?.seekTo(youtubeResumeTime);
                  }
                }}
                onPlayerStateChange={(state: string) => {
                  if (!fullscreenOpen) return;
                  if (state === "playing") setYoutubeIsPlaying(true);
                  if (state === "paused" || state === "ended")
                    setYoutubeIsPlaying(false);
                }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
