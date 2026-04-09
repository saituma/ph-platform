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
  ActivityIndicator,
  Linking,
  Dimensions,
  Modal,
  StyleSheet,
  Platform,
} from "react-native";
const absoluteFillObject = StyleSheet.absoluteFillObject;
import { VideoView, useVideoPlayer } from "expo-video";
import { useEventListener } from "expo";
import { useIsFocused } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import YoutubePlayer from "react-native-youtube-iframe";
import { Text } from "@/components/ScaledText";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { useVideoCache } from "@/hooks/useVideoCache";
import { useActiveTab } from "@/context/ActiveTabContext";
import { useVideoPlaybackController } from "./VideoPlaybackController";

const normalizeUrl = (url: string) => String(url ?? "").trim();

export const isYoutubeUrl = (url?: string) =>
  /youtube\.com|youtu\.be/i.test(normalizeUrl(url ?? ""));

const extractYoutubeVideoId = (url?: string) => {
  const normalized = normalizeUrl(url ?? "");
  if (!normalized) return null;
  const shortMatch = normalized.match(/youtu\.be\/([A-Za-z0-9_-]{6,})/i);
  if (shortMatch?.[1]) return shortMatch[1];
  const watchMatch = normalized.match(/[?&]v=([A-Za-z0-9_-]{6,})/i);
  if (watchMatch?.[1]) return watchMatch[1];
  const embedMatch = normalized.match(/youtube\.com\/embed\/([A-Za-z0-9_-]{6,})/i);
  if (embedMatch?.[1]) return embedMatch[1];
  const shortsMatch = normalized.match(/youtube\.com\/shorts\/([A-Za-z0-9_-]{6,})/i);
  if (shortsMatch?.[1]) return shortsMatch[1];
  return null;
};

const getYoutubeEmbedUrl = (url?: string, autoplay = false, muted = false) => {
  const videoId = extractYoutubeVideoId(url);
  if (!videoId) return null;
  const params = new URLSearchParams({
    enablejsapi: "1",
    playsinline: "1",
    rel: "0",
    modestbranding: "1",
    controls: "1",
    autoplay: autoplay ? "1" : "0",
    mute: muted ? "1" : "0",
  });
  return `https://www.youtube-nocookie.com/embed/${videoId}?${params.toString()}`;
};

const getYoutubePosterUrl = (url?: string) => {
  const videoId = extractYoutubeVideoId(url);
  return videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : null;
};

/** Professional buffer settings: generous forward buffer to minimize stalling and frame drops. */
const PROFESSIONAL_BUFFER_OPTIONS = {
  preferredForwardBufferDuration: 45,
  minBufferForPlayback: 5,
  waitsToMinimizeStalling: true,
} as const;

type YoutubeIframeHandle = {
  getCurrentTime?: () => Promise<number>;
  seekTo?: (seconds: number, allowSeekAhead?: boolean) => void;
};

export type YouTubeEmbedHandle = {
  getCurrentTime: () => Promise<number>;
  seekTo: (seconds: number) => void;
};

type YouTubeEmbedProps = {
  url: string;
  immersive?: boolean;
  shouldPlay?: boolean;
  initialMuted?: boolean;
  onPlayerReady?: () => void;
  onPlayerStateChange?: (state: string) => void;
};

export const YouTubeEmbed = React.forwardRef<YouTubeEmbedHandle, YouTubeEmbedProps>(function YouTubeEmbed(
  { url, immersive = false, shouldPlay = true, initialMuted = false, onPlayerReady, onPlayerStateChange },
  ref,
) {
  const { colors } = useAppTheme();
  const [isReady, setIsReady] = useState(false);
  const [hasEmbedError, setHasEmbedError] = useState(false);
  const [layout, setLayout] = useState({ width: 0, height: 0 });
  const playerRef = useRef<YoutubeIframeHandle | null>(null);
  
  const videoId = useMemo(() => extractYoutubeVideoId(url), [url]);
  const posterUrl = useMemo(() => getYoutubePosterUrl(url), [url]);
  const watchUrl = useMemo(() => {
    return videoId ? `https://www.youtube.com/watch?v=${videoId}` : url;
  }, [url, videoId]);

  React.useImperativeHandle(ref, () => ({
    getCurrentTime: async () => {
      try {
        const t = await playerRef.current?.getCurrentTime?.();
        return typeof t === "number" && Number.isFinite(t) ? t : 0;
      } catch {
        return 0;
      }
    },
    seekTo: (seconds: number) => {
      try {
        playerRef.current?.seekTo?.(seconds, true);
      } catch {
        // ignore
      }
    },
  }), []);

  if (!videoId) {
    return (
      <View style={{ flex: 1, backgroundColor: "#000", justifyContent: "center", alignItems: "center" }}>
        <Text style={{ color: "white", textAlign: "center", padding: 20 }}>
          Invalid YouTube link
        </Text>
        <Pressable onPress={() => Linking.openURL(url).catch(() => {})}>
          <Text style={{ color: colors.accent, textAlign: "center" }}>
            Open in YouTube
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#000" }} onLayout={(e) => setLayout(e.nativeEvent.layout)}>
      {!isReady && posterUrl ? (
        <Image
          source={{ uri: posterUrl }}
          style={absoluteFillObject}
          resizeMode="cover"
        />
      ) : null}
      {!isReady ? (
        <View
          style={[
            absoluteFillObject,
            {
              backgroundColor: "rgba(0,0,0,0.35)",
              justifyContent: "center",
              alignItems: "center",
            },
          ]}
        >
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : null}
      {!hasEmbedError ? (
        layout.width > 0 && layout.height > 0 ? (
          <YoutubePlayer
            ref={playerRef as any}
            height={layout.height}
            width={layout.width}
            videoId={videoId}
            play={shouldPlay}
            mute={initialMuted}
            onReady={() => {
              setIsReady(true);
              onPlayerReady?.();
            }}
            onChangeState={(state: string) => {
              onPlayerStateChange?.(state);
            }}
            onError={(e: unknown) => {
              console.warn('[YouTubeEmbed] Player Error:', e);
              setHasEmbedError(true);
              setIsReady(true);
            }}
            initialPlayerParams={{
              preventFullScreen: true,
              modestbranding: true,
              rel: false,
              controls: true
            }}
            webViewProps={{
              allowsFullscreenVideo: true,
              allowsInlineMediaPlayback: true,
            }}
          />
        ) : null
      ) : (
        <Pressable
          onPress={() => Linking.openURL(watchUrl).catch(() => {})}
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 24,
          }}
        >
          {posterUrl ? (
            <Image
              source={{ uri: posterUrl }}
              style={absoluteFillObject}
              resizeMode="cover"
            />
          ) : null}
          <View
            style={[
              absoluteFillObject,
              { backgroundColor: "rgba(0,0,0,0.55)" },
            ]}
          />
          <View
            style={{
              paddingHorizontal: 18,
              paddingVertical: 10,
              borderRadius: 999,
              backgroundColor: "rgba(255,255,255,0.12)",
              marginBottom: 16,
            }}
          >
            <Text style={{ color: colors.accent, fontWeight: "600" }}>
              YouTube
            </Text>
          </View>
          <Text style={{ color: "white", textAlign: "center", fontSize: 16, marginBottom: 8 }}>
            This video can&apos;t play inline here
          </Text>
          <Text style={{ color: "rgba(255,255,255,0.78)", textAlign: "center", marginBottom: 18 }}>
            Open it directly in YouTube for a smooth playback experience.
          </Text>
          <View
            style={{
              paddingHorizontal: 18,
              paddingVertical: 12,
              borderRadius: 999,
              backgroundColor: colors.accent,
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "600" }}>
              Open in YouTube
            </Text>
          </View>
        </Pressable>
      )}
    </View>
  );
});

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
  const { cachedUri } = useVideoCache(
    disableCache || isYoutube ? null : normalizedUri,
    cacheKey,
  );
  const finalUri = disableCache ? normalizedUri : cachedUri || normalizedUri;
  const sourceForPlayer = (finalUri && typeof finalUri === "string" ? finalUri : normalizedUri) || "";

  const player = useVideoPlayer(sourceForPlayer, (instance) => {
    instance.loop = isLooping;
    instance.muted = initialMuted;
    instance.staysActiveInBackground = false;
    if ("bufferOptions" in instance) {
      (instance as any).bufferOptions = { ...PROFESSIONAL_BUFFER_OPTIONS };
    }
    if (autoPlay && effectiveShouldPlay) instance.play();
  });

  const videoRef = useRef<VideoView>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [isMuted, setIsMuted] = useState(initialMuted);
  const [isLoading, setIsLoading] = useState(true);
  const [isBuffering, setIsBuffering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);
  const [aspectRatio, setAspectRatio] = useState<number | null>(
    initialAspectRatio ?? null,
  );
  const [resolution, setResolution] = useState<{
    width: number;
    height: number;
  } | null>(null);

  const { width: screenWidth, height: screenHeight } =
    Dimensions.get("window");
  const [containerWidth, setContainerWidth] = useState<number | null>(null);
  const releasedRef = useRef(false);

  const safePause = useCallback(() => {
    try {
      player.pause();
    } catch {
      // Ignore errors from released native instances.
    }
  }, [player]);

  const safePlay = useCallback(() => {
    try {
      player.play();
    } catch {
      // Ignore errors from released native instances.
    }
  }, [player]);

  useEffect(() => {
    if (!playbackController) return;
    if (!controllerKey) return;
    return playbackController.register(controllerKey, safePause);
  }, [controllerKey, playbackController, safePause]);

  const safeGetTimeInfo = useCallback(() => {
    try {
      return {
        currentTime: player.currentTime ?? 0,
        duration: player.duration ?? 0,
      };
    } catch {
      return { currentTime: 0, duration: 0 };
    }
  }, [player]);

  useEffect(() => {
    return () => {
      safePause();
    };
  }, [player, safePause]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (next) => {
      setAppActive(next === "active");
      if (next !== "active") safePause();
    });
    return () => sub.remove();
  }, [safePause]);

  useEffect(() => {
    if (ignoreTabFocus) return;
    if (!effectiveShouldPlay || !isVisible) {
      safePause();
      setIsPlaying(false);
    } else if (autoPlay) {
      if (pauseOthers) pauseOthers();
      if (playbackController && controllerKey) playbackController.pauseOthers(controllerKey);
      if (!isPlaying) {
        safePlay();
        setIsPlaying(true);
      }
    }
  }, [ignoreTabFocus, effectiveShouldPlay, isVisible, autoPlay, pauseOthers, safePause, safePlay]);

  useEventListener(player, "videoTrackChange", (e) => {
    const w = e.videoTrack?.size?.width ?? 0;
    const h = e.videoTrack?.size?.height ?? 0;
    if (w > 0 && h > 0) {
      setResolution({ width: w, height: h });
      setAspectRatio(w / h);
    }
  });

  useEffect(() => {
    try {
      const status = player.status;
      if (status === "readyToPlay") {
        setIsLoading(false);
        fadeAnim.setValue(1);
      }
      if (status === "error") {
        setError("Unable to play video. Tap to open externally.");
        setIsLoading(false);
      }
    } catch {
      /* player not ready */
    }
  }, [player, sourceForPlayer, fadeAnim]);

  useEventListener(player, "sourceLoad", (payload) => {
    if (payload.duration > 0) {
      setIsLoading(false);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  });

  useEventListener(player, "statusChange", (e) => {
    const status = e.status;
    if (status === "readyToPlay") {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
      setIsLoading(false);
    }
    if (status === "error") {
      setError("Unable to play video. Tap to open externally.");
      setIsLoading(false);
    }
    setIsBuffering(status === "loading");
  });

  useEventListener(player, "playingChange", (e) =>
    setIsPlaying(e.isPlaying ?? false),
  );

  useEffect(() => {
    const id = setInterval(() => {
      const { currentTime, duration } = safeGetTimeInfo();
      setPosition(currentTime);
      setDuration(duration);
    }, 400);
    return () => clearInterval(id);
  }, [safeGetTimeInfo]);

  /** If native status events lag, duration becoming valid means the asset is readable — hide the spinner. */
  useEffect(() => {
    if (duration <= 0 || !isLoading) return;
    setIsLoading(false);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [duration, isLoading, fadeAnim]);

  const lastDurationRef = useRef(0);
  const endedRef = useRef(false);
  useEffect(() => {
    if (!onDurationMs) return;
    if (!duration || duration === lastDurationRef.current) return;
    lastDurationRef.current = duration;
    onDurationMs(duration * 1000);
  }, [duration, onDurationMs]);

  useEffect(() => {
    endedRef.current = false;
  }, [finalUri]);

  useEffect(() => {
    if (!onEnded || !duration || duration <= 0) return;
    if (position < Math.max(0, duration - 0.35)) {
      endedRef.current = false;
      return;
    }
    if (endedRef.current) return;
    endedRef.current = true;
    onEnded();
  }, [duration, onEnded, position]);

  useEffect(() => {
    if (posterUri && !aspectRatio) {
      Image.getSize(
        posterUri,
        (w, h) => setAspectRatio(w / h),
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
      if (playbackController && controllerKey) playbackController.pauseOthers(controllerKey);
      safePlay();
    }
  };

  const toggleMute = () => {
    const next = !isMuted;
    player.muted = next;
    setIsMuted(next);
  };

  const progress = duration > 0 ? Math.min(1, position / duration) : 0;
  const formatTime = (s: number) =>
    `${Math.floor(s / 60)}:${Math.floor(s % 60)
      .toString()
      .padStart(2, "0")}`;

  const fitMode = contentFitOverride ?? "contain";

  const effectiveAspectRatio = aspectRatio ?? initialAspectRatio ?? 16 / 9;

  const containerSize = useMemo(() => {
    const ratio = effectiveAspectRatio > 0 ? effectiveAspectRatio : 16 / 9;
    const w = containerWidth ?? screenWidth;
    const naturalH = w / ratio;
    const maxH = screenHeight * Math.max(0.5, Math.min(1, maxHeightRatio));
    return {
      width: w,
      height: Math.min(naturalH, maxH),
    };
  }, [containerWidth, effectiveAspectRatio, maxHeightRatio, screenHeight, screenWidth]);

  const resolvedHeight = useVideoResolution ? containerSize.height : height;

  const onContainerLayout = useCallback(
    (e: { nativeEvent: { layout: { width: number; height: number } } }) => {
      const w = e.nativeEvent.layout.width;
      if (w > 0) setContainerWidth(w);
    },
    [],
  );

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
      if (playbackController && controllerKey) playbackController.pauseOthers(controllerKey);
      setFullscreenOpen(true);
    })();
  }, [controllerKey, finalUri, isYoutube, pauseOthers, playbackController]);

  const closeFullscreen = useCallback(() => {
    (async () => {
      const t = await modalYouTubeRef.current?.getCurrentTime();
      setYoutubeResumeTime(typeof t === "number" ? t : 0);
      setFullscreenOpen(false);
      // After closing, seek the inline player back to where the fullscreen left off.
      // (best-effort; if the inline player isn't ready yet this will be ignored)
      setTimeout(() => {
        inlineYouTubeRef.current?.seekTo(typeof t === "number" ? t : 0);
      }, 50);
    })();
  }, []);

  if (error && !isYoutube) {
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
          immersive={immersive}
          shouldPlay={!fullscreenOpen && effectiveShouldPlay && youtubeIsPlaying}
          initialMuted={initialMuted}
          onPlayerStateChange={(state) => {
            if (fullscreenOpen) return;
            if (state === "playing") setYoutubeIsPlaying(true);
            if (state === "paused" || state === "ended") setYoutubeIsPlaying(false);
          }}
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
        <Pressable
          onPress={previewOnly ? onPreviewPress : togglePlay}
          style={[
            absoluteFillObject,
            { justifyContent: "center", alignItems: "center", zIndex: 10 },
          ]}
        >
          {posterUri && (
            <Image
              source={{ uri: posterUri }}
              style={absoluteFillObject}
              resizeMode="cover"
            />
          )}
          <View
            style={[absoluteFillObject, { backgroundColor: "rgba(0,0,0,0.4)" }]}
          />
          <View
            style={{
              backgroundColor: "rgba(255,255,255,0.25)",
              borderRadius: 50,
              padding: 20,
            }}
          >
            <Feather name="play" size={48} color="white" />
          </View>
        </Pressable>
      )}

      {!isYoutube && (isLoading || isBuffering) && showLoadingOverlay && (
        <View
          pointerEvents="none"
          style={[
            absoluteFillObject,
            {
              justifyContent: "center",
              alignItems: "center",
              backgroundColor: "rgba(0,0,0,0.5)",
            },
          ]}
        >
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={{ color: "white", marginTop: 12 }}>
            {isLoading ? "Loading..." : "Buffering..."}
          </Text>
        </View>
      )}

      {!isYoutube && !ignoreTabFocus && !cinematic && !hideCenterControls && !showPoster && (
        <Pressable
          onPress={togglePlay}
          style={[
            absoluteFillObject,
            { justifyContent: "center", alignItems: "center", zIndex: 10 },
          ]}
        >
          <View
            style={{
              backgroundColor: "rgba(0,0,0,0.5)",
              borderRadius: 50,
              padding: 20,
            }}
          >
            <Feather
              name={isPlaying ? "pause" : "play"}
              size={40}
              color="white"
            />
          </View>
        </Pressable>
      )}

      {!isYoutube && !ignoreTabFocus && !hideControls && !showPoster && (
        <View
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            padding: 16,
            backgroundColor: "rgba(0,0,0,0.6)",
          }}
        >
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 8,
            }}
          >
            <Text style={{ color: "white", fontSize: 12 }}>
              {formatTime(position)}
            </Text>
            <Text style={{ color: "white", fontSize: 12 }}>
              {formatTime(duration)}
            </Text>
          </View>
          <View
            style={{
              height: 4,
              backgroundColor: "rgba(255,255,255,0.3)",
              borderRadius: 2,
              overflow: "hidden",
            }}
          >
            <View
              style={{
                height: "100%",
                width: `${progress * 100}%`,
                backgroundColor: colors.accent,
              }}
            />
          </View>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              marginTop: 12,
            }}
          >
            <Pressable onPress={toggleMute}>
              <Feather
                name={isMuted ? "volume-x" : "volume-2"}
                size={24}
                color="white"
              />
            </Pressable>
            <Pressable onPress={togglePlay}>
              <Feather
                name={isPlaying ? "pause" : "play"}
                size={28}
                color="white"
              />
            </Pressable>
            <Pressable onPress={openFullscreen}>
              <Feather name="maximize" size={24} color="white" />
            </Pressable>
          </View>
        </View>
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
          }}
        >
          {resolution && (
            <View
              style={{
                backgroundColor: "rgba(0,0,0,0.6)",
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 20,
              }}
            >
              <Text
                style={{ color: "white", fontSize: 12 }}
              >{`${resolution.width}×${resolution.height}`}</Text>
            </View>
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
            {isYoutube ? (
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
            ) : null}
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

          <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
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
                immersive
                shouldPlay={youtubeIsPlaying}
                initialMuted={initialMuted}
                onPlayerReady={() => {
                  if (youtubeResumeTime > 0) {
                    modalYouTubeRef.current?.seekTo(youtubeResumeTime);
                  }
                }}
                onPlayerStateChange={(state) => {
                  if (!fullscreenOpen) return;
                  if (state === "playing") setYoutubeIsPlaying(true);
                  if (state === "paused" || state === "ended") setYoutubeIsPlaying(false);
                }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
