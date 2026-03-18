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
  StyleSheet,
} from "react-native";
const absoluteFillObject = StyleSheet.absoluteFillObject;
import { VideoView, useVideoPlayer } from "expo-video";
import { useEventListener } from "expo";
import { useIsFocused } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import { Text } from "@/components/ScaledText";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { useVideoCache } from "@/hooks/useVideoCache";
import { useActiveTab } from "@/context/ActiveTabContext";

const normalizeUrl = (url: string) => String(url ?? "").trim();

export const isYoutubeUrl = (url?: string) =>
  /youtube\.com|youtu\.be/i.test(normalizeUrl(url ?? ""));

export function YouTubeEmbed({
  url,
  immersive = false,
  shouldPlay = true,
}: {
  url: string;
  immersive?: boolean;
  shouldPlay?: boolean;
}) {
  const { colors } = useAppTheme();
  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      <Text style={{ color: "white", textAlign: "center", padding: 20 }}>
        YouTube embed placeholder
      </Text>
      <Pressable onPress={() => Linking.openURL(url)}>
        <Text style={{ color: colors.accent, textAlign: "center" }}>
          Open in YouTube
        </Text>
      </Pressable>
    </View>
  );
}

interface VideoPlayerProps {
  uri: string;
  height?: number;
  autoPlay?: boolean;
  initialMuted?: boolean;
  isLooping?: boolean;
  useVideoResolution?: boolean;
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
}

export function VideoPlayer({
  uri,
  height = 220,
  autoPlay = false,
  initialMuted = true,
  isLooping = true,
  useVideoResolution = true,
  maxHeightRatio = 0.8,
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
}: VideoPlayerProps) {
  const { colors, isDark } = useAppTheme();
  const navFocused = useIsFocused();
  const { activeTabIndex, currentTabIndex } = useActiveTab();
  const isTabActive = activeTabIndex === currentTabIndex;

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

  const player = useVideoPlayer({ uri: finalUri }, (instance) => {
    instance.loop = isLooping;
    instance.muted = initialMuted;
    instance.staysActiveInBackground = false;
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
    if (!effectiveShouldPlay || !isVisible) {
      if (isPlaying) {
        safePause();
        setIsPlaying(false);
      }
    } else {
      if (pauseOthers) pauseOthers();
      if (!isPlaying) {
        safePlay();
        setIsPlaying(true);
      }
    }
  }, [effectiveShouldPlay, isVisible, pauseOthers, safePause, safePlay, isPlaying]);

  useEventListener(player, "videoTrackChange", (e) => {
    const w = e.videoTrack?.size?.width ?? 0;
    const h = e.videoTrack?.size?.height ?? 0;
    if (w > 0 && h > 0) {
      setResolution({ width: w, height: h });
      setAspectRatio(w / h);
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
    // Buffering is inferred from status === 'loading' or long 'loading' duration
    // Removed invalid string comparison → no more TS error
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
    else safePlay();
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

  const fitMode =
    contentFitOverride ||
    (cinematic
      ? "cover"
      : aspectRatio && aspectRatio < 1
        ? "contain"
        : "cover");

  const resolvedHeight = useMemo(() => {
    if (!aspectRatio) return height;
    const calc = screenWidth / aspectRatio;
    const maxH = screenHeight * Math.max(0.3, Math.min(1, maxHeightRatio));
    return Math.min(calc, maxH);
  }, [aspectRatio, height, maxHeightRatio, screenHeight, screenWidth]);

  const showPoster = !isPlaying && position < 0.5 && !error && !previewOnly;

  if (isYoutube) {
    return (
      <YouTubeEmbed
        url={uri}
        immersive={immersive}
        shouldPlay={propShouldPlay}
      />
    );
  }

  if (error) {
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
      style={{
        height: useVideoResolution ? resolvedHeight : height,
        backgroundColor: "#000",
        overflow: "hidden",
        borderRadius: immersive || cinematic ? 0 : 24,
        borderWidth: immersive || cinematic ? 0 : 1,
        borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)",
      }}
    >
      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        <VideoView
          ref={videoRef}
          player={player}
          style={{ flex: 1 }}
          contentFit={fitMode}
          nativeControls={false}
          allowsPictureInPicture
        />
      </Animated.View>

      {showPoster && (
        <Pressable
          onPress={previewOnly ? onPreviewPress : togglePlay}
          style={[
            absoluteFillObject,
            { justifyContent: "center", alignItems: "center" },
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

      {(isLoading || isBuffering) && showLoadingOverlay && (
        <View
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

      {!cinematic && !hideCenterControls && !showPoster && (
        <Pressable
          onPress={togglePlay}
          style={[
            absoluteFillObject,
            { justifyContent: "center", alignItems: "center" },
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

      {!hideControls && !showPoster && (
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
          </View>
        </View>
      )}

      {!hideTopChrome && (
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
        </View>
      )}
    </View>
  );
}
