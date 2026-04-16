import React, {
  useState,
  useRef,
  useEffect,
  useMemo,
  useCallback,
  useContext,
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
import {
  NavigationContext,
  NavigationContainerRefContext,
} from "@react-navigation/native";
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
import { useSafeIsFocused } from "@/hooks/navigation/useSafeReactNavigation";
import { fetchOembedAspectRatio } from "@/lib/video/oembedAspect";
import { fitVideoBoxInMaxBounds } from "@/lib/video/fitVideoBox";

export { YouTubeEmbed, isYoutubeUrl, normalizeUrl, YouTubeEmbedHandle };

/** True for Loom share/embed links (including useloom.com). */
export function isLoomUrl(url?: string) {
  const u = normalizeUrl(url ?? "");
  if (!u) return false;
  return /(?:^|\/\/)(?:www\.)?(?:loom\.com|useloom\.com)\b/i.test(u);
}

/** Prefer Loom’s embed player URL so WebView can play inline. */
export function resolveLoomEmbedUrl(url: string): string {
  const u = normalizeUrl(url);
  if (!isLoomUrl(u)) return u;
  const embed = u.match(
    /(?:www\.)?loom\.com\/embed\/([A-Za-z0-9_-]+)/i,
  );
  if (embed?.[1]) return `https://www.loom.com/embed/${embed[1]}`;
  const share = u.match(
    /(?:www\.)?(?:loom\.com|useloom\.com)\/share\/([A-Za-z0-9_-]+)/i,
  );
  if (share?.[1]) return `https://www.loom.com/embed/${share[1]}`;
  return u;
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

export function VideoPlayer(props: VideoPlayerProps) {
  const navigation = useContext(NavigationContext);
  const containerRef = useContext(NavigationContainerRefContext);
  // Match `useNavigation()` preconditions so we never mount `useIsFocused` without a provider.
  // Also avoids crashes when duplicate @react-navigation/native copies split context (pnpm dedupe fixes that).
  if (navigation === undefined && containerRef === undefined) {
    return <VideoPlayerBase {...props} navFocused={true} />;
  }

  return <VideoPlayerWithNav {...props} />;
}

function VideoPlayerWithNav(props: VideoPlayerProps) {
  const isFocused = useSafeIsFocused(true);
  return <VideoPlayerBase {...props} navFocused={isFocused} />;
}

function VideoPlayerBase(props: VideoPlayerProps & { navFocused: boolean }) {
  const normalizedUri = normalizeUrl(props.uri);
  const isY = isYoutubeUrl(normalizedUri);
  const isL = isLoomUrl(normalizedUri);
  const loomEmbed = useMemo(
    () => resolveLoomEmbedUrl(normalizedUri),
    [normalizedUri],
  );

  const { cachedUri } = useVideoCache(
    props.disableCache || isY || isL ? null : normalizedUri,
    props.cacheKey,
  );
  const finalSource = props.disableCache ? normalizedUri : cachedUri || normalizedUri;

  if (isY) return <VideoPlayerYoutubeMode {...props} />;
  if (isL) {
    return (
      <VideoPlayerLoomMode
        {...props}
        embedUri={loomEmbed}
        pageLinkUri={normalizedUri}
      />
    );
  }
  return <VideoPlayerExpoNativeMode {...props} sourceUri={finalSource} />;
}

function VideoPlayerYoutubeMode({
  uri,
  height = 220,
  initialMuted = true,
  useVideoResolution = true,
  maxHeightRatio = 1,
  shouldPlay: propShouldPlay = true,
  title,
  isVisible = true,
  ignoreTabFocus = false,
  hideTopChrome = false,
  immersive = false,
  cinematic = false,
  controllerKey,
  pauseOthers,
  navFocused,
}: VideoPlayerProps & { navFocused: boolean }) {
  const { isDark } = useAppTheme();
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

  /** All YouTube embeds use a 16:9 frame (Shorts/portrait content is letterboxed inside). */
  const effectiveAspectRatio = 16 / 9;
  const effectiveMaxHeightRatio = maxHeightRatio;

  const { width: screenWidth, height: screenHeight } = Dimensions.get("window");
  const [containerWidth, setContainerWidth] = useState<number | null>(null);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (next) => {
      setAppActive(next === "active");
    });
    return () => sub.remove();
  }, []);

  const containerSize = useMemo(() => {
    const ratio =
      effectiveAspectRatio > 0 ? effectiveAspectRatio : 16 / 9;
    const maxW = containerWidth ?? screenWidth;
    const maxH =
      screenHeight * Math.max(0.5, Math.min(1, effectiveMaxHeightRatio));
    return fitVideoBoxInMaxBounds(maxW, maxH, ratio);
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

  const rotation = screenWidth < screenHeight ? "90deg" : "0deg";
  const fullscreenWidth = Math.max(screenWidth, screenHeight);
  const fullscreenHeight = Math.min(screenWidth, screenHeight);

  const fullscreenVideoSize = useMemo(() => {
    const ar =
      effectiveAspectRatio > 0 ? effectiveAspectRatio : 16 / 9;
    let vw = fullscreenWidth;
    let vh = vw / ar;
    if (vh > fullscreenHeight) {
      vh = fullscreenHeight;
      vw = vh * ar;
    }
    return { width: vw, height: vh };
  }, [effectiveAspectRatio, fullscreenHeight, fullscreenWidth]);

  const openFullscreen = useCallback(() => {
    void (async () => {
      const t = await inlineYouTubeRef.current?.getCurrentTime();
      setYoutubeResumeTime(typeof t === "number" ? t : 0);
      if (pauseOthers) pauseOthers();
      if (playbackController && controllerKey)
        playbackController.pauseOthers(controllerKey);
      setFullscreenOpen(true);
    })();
  }, [controllerKey, pauseOthers, playbackController]);

  const closeFullscreen = useCallback(() => {
    void (async () => {
      const t = await modalYouTubeRef.current?.getCurrentTime();
      setYoutubeResumeTime(typeof t === "number" ? t : 0);
      setFullscreenOpen(false);
      setTimeout(() => {
        inlineYouTubeRef.current?.seekTo(typeof t === "number" ? t : 0);
      }, 50);
    })();
  }, []);

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
        alignItems: "center",
      }}
    >
      <YouTubeEmbed
        ref={inlineYouTubeRef as any}
        url={uri}
        width={containerSize.width}
        height={containerSize.height}
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

      {!ignoreTabFocus && !hideTopChrome && (
        <View
          style={{
            position: "absolute",
            top: 12,
            left: 12,
            right: 12,
            flexDirection: "row",
            justifyContent: "flex-end",
            zIndex: 30,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            {title ? (
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
            ) : null}
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
                width: fullscreenVideoSize.width,
                height: fullscreenVideoSize.height,
                transform: [{ rotate: rotation }],
              }}
            >
              <YouTubeEmbed
                ref={modalYouTubeRef as any}
                url={uri}
                shouldPlay={youtubeIsPlaying}
                initialMuted={initialMuted}
                width={fullscreenVideoSize.width}
                height={fullscreenVideoSize.height}
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

const LOOM_WEBVIEW_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

function VideoPlayerLoomMode({
  height = 220,
  useVideoResolution = true,
  maxHeightRatio = 1,
  initialAspectRatio,
  title,
  hideTopChrome = false,
  immersive = false,
  cinematic = false,
  embedUri,
  pageLinkUri,
}: VideoPlayerProps & {
  navFocused: boolean;
  embedUri: string;
  pageLinkUri: string;
}) {
  const { isDark } = useAppTheme();
  const { width: screenWidth, height: screenHeight } = Dimensions.get("window");
  const [containerWidth, setContainerWidth] = useState<number | null>(null);
  const [oembedAspectRatio, setOembedAspectRatio] = useState<number | null>(
    null,
  );

  useEffect(() => {
    setOembedAspectRatio(null);
    let cancelled = false;
    void (async () => {
      const r = await fetchOembedAspectRatio(pageLinkUri, "loom");
      if (!cancelled && r != null && Number.isFinite(r) && r > 0) {
        setOembedAspectRatio(r);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pageLinkUri]);

  const effectiveAspectRatio =
    oembedAspectRatio ?? initialAspectRatio ?? 16 / 9;
  const effectiveMaxHeightRatio =
    effectiveAspectRatio > 0 && effectiveAspectRatio < 1
      ? Math.max(maxHeightRatio, 0.95)
      : maxHeightRatio;

  const containerSize = useMemo(() => {
    const ratio = effectiveAspectRatio > 0 ? effectiveAspectRatio : 16 / 9;
    const maxW = containerWidth ?? screenWidth;
    const maxH =
      screenHeight * Math.max(0.5, Math.min(1, effectiveMaxHeightRatio));
    return fitVideoBoxInMaxBounds(maxW, maxH, ratio);
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

  const webSourceUri =
    /^https?:\/\//i.test(embedUri) && embedUri.includes("loom.com/embed")
      ? embedUri
      : /^https?:\/\//i.test(pageLinkUri)
        ? pageLinkUri
        : embedUri;

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
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <WebView
        source={{ uri: webSourceUri }}
        style={{
          width: containerSize.width,
          height: containerSize.height,
          backgroundColor: "#000",
        }}
        allowsFullscreenVideo
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        javaScriptEnabled
        domStorageEnabled
        thirdPartyCookiesEnabled
        sharedCookiesEnabled
        setSupportMultipleWindows={true}
        mixedContentMode="always"
        scrollEnabled={false}
        originWhitelist={["*"]}
        userAgent={LOOM_WEBVIEW_UA}
        {...(Platform.OS === "android"
          ? { nestedScrollEnabled: false }
          : {})}
      />

      {!hideTopChrome ? (
        <View
          style={{
            position: "absolute",
            top: 12,
            left: 12,
            right: 12,
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            zIndex: 30,
          }}
        >
          {title ? (
            <Text
              style={{
                color: "white",
                fontSize: 14,
                backgroundColor: "rgba(0,0,0,0.6)",
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 20,
                flexShrink: 1,
              }}
            >
              {title}
            </Text>
          ) : (
            <View />
          )}
          <Pressable
            onPress={() => Linking.openURL(pageLinkUri)}
            style={{
              backgroundColor: "rgba(0,0,0,0.6)",
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 20,
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Feather name="external-link" size={16} color="#fff" />
            <Text style={{ color: "white", fontSize: 13 }}>Open</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

function VideoPlayerExpoNativeMode({
  sourceUri,
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
  navFocused,
}: VideoPlayerProps & { navFocused: boolean; sourceUri: string }) {
  const { colors, isDark } = useAppTheme();
  const { activeTabIndex, currentTabIndex } = useActiveTab();
  const isTabActive = activeTabIndex === currentTabIndex;
  const playbackController = useVideoPlaybackController();

  const [appActive, setAppActive] = useState(
    AppState.currentState === "active",
  );

  const effectiveShouldPlay =
    propShouldPlay &&
    (ignoreTabFocus || (navFocused && isTabActive)) &&
    appActive &&
    isVisible;

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
    sourceUri: sourceUri || "",
    autoPlay,
    initialMuted,
    isLooping,
    effectiveShouldPlay,
    isVisible,
    onDurationMs,
    onEnded,
    fadeAnim,
  });

  const videoRef = useRef<InstanceType<typeof VideoView> | null>(null);
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

  const [posterAspectRatio, setPosterAspectRatio] = useState<number | null>(
    null,
  );

  useEffect(() => {
    if (!posterUri) {
      setPosterAspectRatio(null);
      return;
    }
    Image.getSize(
      posterUri,
      (w, h) => {
        if (w > 0 && h > 0) setPosterAspectRatio(w / h);
      },
      () => setPosterAspectRatio(null),
    );
  }, [posterUri]);

  const finalUri = sourceUri;

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
  const aspectFromResolution =
    resolution &&
    resolution.width > 0 &&
    resolution.height > 0
      ? resolution.width / resolution.height
      : null;
  const intrinsicAspect = useMemo(() => {
    const fromEngine = aspectRatio ?? posterAspectRatio ?? null;
    const fromPixels = aspectFromResolution;
    if (fromPixels != null && fromEngine != null) {
      const pPort = fromPixels < 1;
      const ePort = fromEngine < 1;
      if (pPort !== ePort) return fromPixels;
    }
    return (
      aspectRatio ??
      posterAspectRatio ??
      aspectFromResolution ??
      initialAspectRatio ??
      null
    );
  }, [
    aspectRatio,
    posterAspectRatio,
    aspectFromResolution,
    initialAspectRatio,
  ]);
  const fitMode =
    contentFitOverride ??
    (intrinsicAspect != null && intrinsicAspect < 1 ? "cover" : "contain");
  const effectiveMaxHeightRatio =
    intrinsicAspect != null && intrinsicAspect > 0 && intrinsicAspect < 1
      ? Math.max(maxHeightRatio, 0.95)
      : maxHeightRatio;

  const containerSize = useMemo(() => {
    const maxW = containerWidth ?? screenWidth;
    const maxH =
      screenHeight * Math.max(0.5, Math.min(1, effectiveMaxHeightRatio));
    if (intrinsicAspect == null || !(intrinsicAspect > 0)) {
      // No metadata yet — avoid assuming 16:9 (prevents squishing portrait into a wide box).
      return { width: maxW, height };
    }
    return fitVideoBoxInMaxBounds(maxW, maxH, intrinsicAspect);
  }, [
    containerWidth,
    height,
    intrinsicAspect,
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

  const openFullscreen = useCallback(() => {
    if (pauseOthers) pauseOthers();
    if (playbackController && controllerKey) {
      playbackController.pauseOthers(controllerKey);
    }
    void videoRef.current?.enterFullscreen();
  }, [controllerKey, pauseOthers, playbackController]);

  if (error) {
    return (
      <Pressable
        onPress={() => Linking.openURL(finalUri)}
        style={{
          flex: 1,
          backgroundColor: "#000",
          justifyContent: "center",
          alignItems: "center",
          minHeight: height,
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
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Animated.View
        style={{
          width: containerSize.width,
          height: containerSize.height,
          opacity: fadeAnim,
        }}
      >
        <VideoView
          ref={videoRef}
          player={player}
          style={{ flex: 1, width: "100%", height: "100%" }}
          contentFit={fitMode}
          nativeControls={ignoreTabFocus}
          fullscreenOptions={{ enable: true, orientation: "default" }}
          allowsPictureInPicture
          {...(Platform.OS === "android" ? { surfaceType: "textureView" } : {})}
        />
      </Animated.View>

      {!ignoreTabFocus && showPoster && (
        <VideoPoster
          posterUri={posterUri}
          onPress={togglePlay}
          previewOnly={previewOnly}
          onPreviewPress={onPreviewPress}
        />
      )}

      {showLoadingOverlay && (
        <VideoLoadingOverlay
          isLoading={isLoading}
          isBuffering={isBuffering}
          accentColor={colors.accent}
        />
      )}

      {!ignoreTabFocus && !cinematic && !showPoster && (
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
          {resolution ? (
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
          ) : (
            <View />
          )}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            {title ? (
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
            ) : null}
          </View>
        </View>
      )}
    </View>
  );
}
