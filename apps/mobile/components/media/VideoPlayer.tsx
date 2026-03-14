import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Animated, Easing, Image, LayoutChangeEvent, Linking, Modal, Pressable, View, useWindowDimensions } from "react-native";
import { VideoView, useVideoPlayer } from "expo-video";
import { WebView } from "react-native-webview";
import { Feather } from "@expo/vector-icons";
import { Text } from "@/components/ScaledText";
import { useAppTheme } from "@/app/theme/AppThemeProvider";

const normalizeUrl = (url: string) => {
  const trimmed = String(url ?? "").trim();
  if (!trimmed) return trimmed;
  if (/^(https?:|file:|content:|asset:|blob:|data:)/i.test(trimmed)) {
    return trimmed;
  }
  if (trimmed.startsWith("//")) {
    return `https:${trimmed}`;
  }
  return `https://${trimmed}`;
};

const sanitizeYoutubeId = (value: string | null | undefined) => {
  if (!value) return null;
  const trimmed = value.trim();
  if (/^[A-Za-z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }
  return null;
};

const getYoutubeId = (url: string) => {
  const normalized = normalizeUrl(url);
  try {
    const parsed = new URL(normalized);
    const host = parsed.hostname.toLowerCase();
    const pathname = parsed.pathname;

    if (host.includes("youtu.be")) {
      const shortId = pathname.replace(/^\/+/, "").split("/")[0];
      return sanitizeYoutubeId(shortId);
    }

    if (host.includes("youtube.com")) {
      const fromQuery = parsed.searchParams.get("v");
      if (fromQuery) return sanitizeYoutubeId(fromQuery);

      const pathSegments = pathname.split("/").filter(Boolean);
      const markerIndex = pathSegments.findIndex((segment) =>
        ["shorts", "embed", "live", "v"].includes(segment.toLowerCase()),
      );
      if (markerIndex >= 0 && pathSegments[markerIndex + 1]) {
        return sanitizeYoutubeId(pathSegments[markerIndex + 1]);
      }
    }
  } catch {
    // fallback to regex parser below
  }

  const shortMatch = normalized.match(/youtu\.be\/([^?#/]+)/i);
  if (shortMatch) return sanitizeYoutubeId(shortMatch[1]);
  const shortsMatch = normalized.match(/\/shorts\/([^?#/]+)/i);
  if (shortsMatch) return sanitizeYoutubeId(shortsMatch[1]);
  const embedMatch = normalized.match(/\/embed\/([^?#/]+)/i);
  if (embedMatch) return sanitizeYoutubeId(embedMatch[1]);
  const liveMatch = normalized.match(/\/live\/([^?#/]+)/i);
  if (liveMatch) return sanitizeYoutubeId(liveMatch[1]);
  const watchMatch = normalized.match(/[?&]v=([^&#]+)/i);
  if (watchMatch) return sanitizeYoutubeId(watchMatch[1]);
  return null;
};

const parseYoutubeStartSeconds = (url: string) => {
  const normalized = normalizeUrl(url);
  const startMatch = normalized.match(/[?&](?:t|start)=([^&#]+)/i);
  if (!startMatch) return null;
  const raw = decodeURIComponent(startMatch[1] ?? "").trim().toLowerCase();
  if (!raw) return null;
  if (/^\d+$/.test(raw)) {
    const value = Number(raw);
    return Number.isFinite(value) && value > 0 ? value : null;
  }
  const parts = raw.match(/(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?/i);
  if (!parts) return null;
  const hours = Number(parts[1] ?? 0);
  const minutes = Number(parts[2] ?? 0);
  const seconds = Number(parts[3] ?? 0);
  const total = hours * 3600 + minutes * 60 + seconds;
  return total > 0 ? total : null;
};

const getYoutubeWatchUrl = (videoId: string, url: string, mobile = false) => {
  const start = parseYoutubeStartSeconds(url);
  const params = [`v=${videoId}`, "playsinline=1"];
  if (start) {
    params.push(`t=${start}s`);
  }
  const host = mobile ? "m.youtube.com" : "www.youtube.com";
  return `https://${host}/watch?${params.join("&")}`;
};

export const isYoutubeUrl = (url?: string) => {
  if (!url) return false;
  const normalized = normalizeUrl(url);
  return /youtube\.com|youtu\.be/i.test(normalized);
};

const getResolutionLabel = (width: number, height: number) => {
  const maxSide = Math.max(width, height);
  if (maxSide >= 3840) return "4K";
  if (maxSide >= 1920) return "FHD";
  if (maxSide >= 1280) return "HD";
  if (maxSide >= 854) return "SD";
  return "Video";
};

export function YouTubeEmbed({ url, immersive = false }: { url: string; immersive?: boolean }) {
  const { colors, isDark } = useAppTheme();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const videoId = useMemo(() => getYoutubeId(url), [url]);
  const watchUrls = useMemo(() => {
    if (!videoId) return [] as string[];
    return [
      getYoutubeWatchUrl(videoId, url, false),
      getYoutubeWatchUrl(videoId, url, true),
    ];
  }, [videoId, url]);
  const [sourceIndex, setSourceIndex] = useState(0);
  const [webError, setWebError] = useState(false);
  const [isWebLoading, setIsWebLoading] = useState(true);
  const [isFullscreenLoading, setIsFullscreenLoading] = useState(true);
  const [hasInitialLoadFinished, setHasInitialLoadFinished] = useState(false);
  const [hasFullscreenLoadFinished, setHasFullscreenLoadFinished] = useState(false);
  const [isFullscreenOpen, setIsFullscreenOpen] = useState(false);
  const [fullscreenRotation, setFullscreenRotation] = useState(0);
  const [playerWidth, setPlayerWidth] = useState(0);
  const [videoAspectRatio, setVideoAspectRatio] = useState<number | null>(null);

  useEffect(() => {
    setSourceIndex(0);
    setWebError(false);
    setIsWebLoading(true);
    setIsFullscreenLoading(true);
    setHasInitialLoadFinished(false);
    setHasFullscreenLoadFinished(false);
    setIsFullscreenOpen(false);
    setFullscreenRotation(0);
    setVideoAspectRatio(null);
  }, [watchUrls]);

  const activeUrl = watchUrls[sourceIndex] ?? null;

  const onPlayerLayout = useCallback((event: LayoutChangeEvent) => {
    setPlayerWidth(event.nativeEvent.layout.width);
  }, []);

  const resolvedAspectRatio = useMemo(() => {
    if (videoAspectRatio && Number.isFinite(videoAspectRatio) && videoAspectRatio > 0.4 && videoAspectRatio < 3.5) {
      return videoAspectRatio;
    }
    return 16 / 9;
  }, [videoAspectRatio]);

  const resolvedHeight = useMemo(() => {
    if (!playerWidth) return 360;
    const calculated = Math.round(playerWidth / resolvedAspectRatio);
    if (resolvedAspectRatio >= 1) {
      return Math.max(340, Math.min(760, calculated));
    }
    return Math.max(520, Math.min(920, calculated));
  }, [playerWidth, resolvedAspectRatio]);

  const shouldRotateFullscreen = useMemo(() => {
    return resolvedAspectRatio > 1.01 && screenHeight >= screenWidth;
  }, [resolvedAspectRatio, screenHeight, screenWidth]);

  const isFullscreenRotated = fullscreenRotation % 180 !== 0;
  const videoQualityLabel = useMemo(() => {
    if (!videoAspectRatio) return "Adaptive";
    return resolvedAspectRatio >= 1.7 ? "Widescreen" : "Portrait";
  }, [resolvedAspectRatio, videoAspectRatio]);
  const panelColor = immersive ? "transparent" : isDark ? colors.cardElevated : "#F7FFF9";
  const chromeColor = isDark ? "rgba(12,28,18,0.82)" : "rgba(255,255,255,0.88)";
  const overlayColor = isDark ? "rgba(16,33,22,0.72)" : "rgba(15,23,42,0.22)";

  const tryNextSource = useCallback(() => {
    if (sourceIndex < watchUrls.length - 1) {
      setSourceIndex((prev) => prev + 1);
      setWebError(false);
      setIsWebLoading(true);
      setIsFullscreenLoading(true);
      setHasInitialLoadFinished(false);
      setHasFullscreenLoadFinished(false);
      return true;
    }
    return false;
  }, [sourceIndex, watchUrls.length]);

  const handleWebViewMessage = useCallback((event: any) => {
    const raw = String(event?.nativeEvent?.data ?? "");
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      const type = String(parsed?.type ?? "");
      if (type === "video-failed") {
        if (!tryNextSource()) {
          setWebError(true);
          setIsWebLoading(false);
          setIsFullscreenLoading(false);
        }
        return;
      }
      if (type !== "video-size") return;
      const width = Number(parsed?.width ?? 0);
      const height = Number(parsed?.height ?? 0);
      if (width > 0 && height > 0) {
        const ratio = width / height;
        if (Number.isFinite(ratio) && ratio > 0.4 && ratio < 3.5) {
          setVideoAspectRatio((prev) => (prev && Math.abs(prev - ratio) < 0.01 ? prev : ratio));
        }
      }
    } catch {
      // ignore malformed payloads
    }
  }, [tryNextSource]);

  const injectedResolutionScript = useMemo(() => `
    (function() {
      function post(type, payload) {
        try {
          if (!window.ReactNativeWebView || !window.ReactNativeWebView.postMessage) return;
          var message = payload ? Object.assign({ type: type }, payload) : { type: type };
          window.ReactNativeWebView.postMessage(JSON.stringify(message));
        } catch (e) {}
      }
      function applyMinimalWatchUi() {
        try {
          var styleId = '__rn_yt_watch_minimal_ui__';
          if (!document.getElementById(styleId)) {
            var style = document.createElement('style');
            style.id = styleId;
            style.textContent = ''
              + 'ytm-mobile-topbar-renderer, ytm-pivot-bar-renderer, ytm-searchbox, ytm-slim-video-metadata-section-renderer, ytm-slim-owner-renderer, ytm-video-action-bar-renderer, ytm-item-section-renderer, ytm-comment-section-renderer, ytm-watch-next-secondary-results-renderer, ytm-merch-shelf-renderer, #comments, #related { display: none !important; }'
              + 'html, body { background: #000 !important; }'
              + '#player-container-id, #player-container, #player { margin: 0 !important; }';
            document.head.appendChild(style);
          }
        } catch (e) {}
      }
      function sendVideoSize() {
        try {
          var video = document.querySelector('video');
          if (!video) return;
          var width = Number(video.videoWidth || 0);
          var height = Number(video.videoHeight || 0);
          if (width > 0 && height > 0) {
            post('video-size', { width: width, height: height });
          }
        } catch (e) {}
      }
      function detectFailure() {
        try {
          var txt = ((document.body && document.body.innerText) || '').toLowerCase();
          if (!txt) return;
          if (
            txt.indexOf('configuration error') >= 0 ||
            txt.indexOf('video unavailable') >= 0 ||
            txt.indexOf('video is unavailable') >= 0
          ) {
            post('video-failed');
          }
        } catch (e) {}
      }
      applyMinimalWatchUi();
      sendVideoSize();
      document.addEventListener('DOMContentLoaded', applyMinimalWatchUi, true);
      document.addEventListener('readystatechange', applyMinimalWatchUi, true);
      document.addEventListener('loadedmetadata', sendVideoSize, true);
      document.addEventListener('play', sendVideoSize, true);
      setTimeout(function() { applyMinimalWatchUi(); sendVideoSize(); }, 700);
      setTimeout(function() { applyMinimalWatchUi(); sendVideoSize(); }, 1700);
      setTimeout(detectFailure, 1800);
      setTimeout(detectFailure, 3600);
      setInterval(sendVideoSize, 1500);
      setInterval(detectFailure, 2500);
    })();
    true;
  `, []);

  if (!videoId) {
    return (
      <View className="rounded-2xl border border-app/10 bg-input px-4 py-4">
        <Text className="text-sm font-outfit text-secondary">Invalid or unsupported YouTube link.</Text>
      </View>
    );
  }

  const handleOpenYoutube = async () => {
    try {
      await Linking.openURL(normalizeUrl(url));
    } catch {
      // ignore
    }
  };

  return (
    <View
      className={`overflow-hidden border border-app/10 w-full ${immersive ? "rounded-none" : "rounded-[24px]"}`}
      style={{ backgroundColor: panelColor, borderWidth: immersive ? 0 : 1 }}
    >
      <View
        className="overflow-hidden w-full"
        style={{ height: resolvedHeight }}
        onLayout={onPlayerLayout}
      >
        {activeUrl && !webError ? (
          <>
            <WebView
              source={{ uri: activeUrl }}
              originWhitelist={["*"]}
              javaScriptEnabled
              domStorageEnabled
              mediaPlaybackRequiresUserAction={false}
              allowsInlineMediaPlayback
              allowsFullscreenVideo
              thirdPartyCookiesEnabled
              mixedContentMode="always"
              setSupportMultipleWindows={false}
              injectedJavaScriptBeforeContentLoaded={injectedResolutionScript}
              injectedJavaScript={injectedResolutionScript}
              startInLoadingState={false}
              onLoadStart={() => {
                if (!hasInitialLoadFinished) {
                  setIsWebLoading(true);
                }
              }}
              onLoadEnd={() => {
                setIsWebLoading(false);
                if (!hasInitialLoadFinished) {
                  setHasInitialLoadFinished(true);
                }
              }}
              onMessage={handleWebViewMessage}
              onError={() => {
                if (!tryNextSource()) {
                  setIsWebLoading(false);
                  setWebError(true);
                }
              }}
              onHttpError={() => {
                if (!tryNextSource()) {
                  setIsWebLoading(false);
                  setWebError(true);
                }
              }}
              style={{ flex: 1, backgroundColor: panelColor }}
            />
            {isWebLoading ? (
              <View className="absolute inset-0 items-center justify-center" style={{ backgroundColor: overlayColor }}>
                <View className="rounded-full px-4 py-2 flex-row items-center gap-2" style={{ backgroundColor: chromeColor }}>
                  <ActivityIndicator color={colors.accent} size="small" />
                  <Text className="text-xs font-outfit" style={{ color: colors.text }}>Loading video…</Text>
                </View>
              </View>
            ) : null}
            {!immersive ? (
              <View className="absolute top-3 left-3 flex-row items-center gap-2">
                <View className="rounded-full px-3 py-1.5" style={{ backgroundColor: chromeColor }}>
                  <Text className="text-[10px] font-outfit font-bold uppercase tracking-[1.2px]" style={{ color: colors.accent }}>
                    {videoQualityLabel}
                  </Text>
                </View>
                <View className="rounded-full px-3 py-1.5" style={{ backgroundColor: chromeColor }}>
                  <Text className="text-[10px] font-outfit font-semibold" style={{ color: colors.text }}>
                    Best available quality
                  </Text>
                </View>
              </View>
            ) : null}
            <Pressable
              onPress={handleOpenYoutube}
              className="absolute top-3 right-3 h-11 w-11 rounded-full items-center justify-center border"
              style={({ pressed }) => ({
                backgroundColor: chromeColor,
                borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(15,23,42,0.08)",
                opacity: pressed ? 0.85 : 1,
                transform: [{ scale: pressed ? 0.96 : 1 }],
              })}
              accessibilityLabel="Open in YouTube"
            >
              <Feather name="external-link" size={17} color={colors.accent} />
            </Pressable>
            <Pressable
              onPress={() => {
                setFullscreenRotation(shouldRotateFullscreen ? 90 : 0);
                setIsFullscreenLoading(true);
                setIsFullscreenOpen(true);
              }}
              className="absolute bottom-3 right-3 h-11 w-11 rounded-full items-center justify-center border"
              style={({ pressed }) => ({
                backgroundColor: chromeColor,
                borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(15,23,42,0.08)",
                opacity: pressed ? 0.85 : 1,
                transform: [{ scale: pressed ? 0.96 : 1 }],
              })}
              accessibilityLabel="Open fullscreen"
            >
              <Feather name="maximize" size={17} color={colors.accent} />
            </Pressable>
          </>
        ) : (
          <View className="flex-1 items-center justify-center px-4">
            <View className="h-10 w-10 rounded-full items-center justify-center mb-3" style={{ backgroundColor: chromeColor }}>
              <Feather name="alert-triangle" size={18} color={colors.accent} />
            </View>
            <Text className="text-sm font-outfit text-center mb-3" style={{ color: colors.text }}>
              Unable to play this video in-app.
            </Text>
            <Pressable
              onPress={handleOpenYoutube}
              className="rounded-full px-4 py-2 border"
              style={({ pressed }) => ({
                backgroundColor: chromeColor,
                borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(15,23,42,0.08)",
                opacity: pressed ? 0.85 : 1,
              })}
            >
              <Text className="text-xs font-outfit" style={{ color: colors.accent }}>Open in YouTube</Text>
            </Pressable>
          </View>
        )}
      </View>

      <Modal
        visible={isFullscreenOpen}
        transparent={false}
        animationType="fade"
        onRequestClose={() => setIsFullscreenOpen(false)}
        supportedOrientations={["portrait", "landscape"]}
      >
        <View className="flex-1 items-center justify-center" style={{ backgroundColor: isDark ? "#102116" : colors.background }}>
          {activeUrl ? (
            <View
              style={
                isFullscreenRotated
                  ? {
                      width: screenHeight,
                      height: screenWidth,
                      transform: [{ rotate: `${fullscreenRotation}deg` }],
                    }
                  : { width: "100%", height: "100%", transform: [{ rotate: `${fullscreenRotation}deg` }] }
              }
            >
              <WebView
                source={{ uri: activeUrl }}
                originWhitelist={["*"]}
                javaScriptEnabled
                domStorageEnabled
                mediaPlaybackRequiresUserAction={false}
                allowsInlineMediaPlayback
                allowsFullscreenVideo
                thirdPartyCookiesEnabled
                mixedContentMode="always"
                setSupportMultipleWindows={false}
                injectedJavaScriptBeforeContentLoaded={injectedResolutionScript}
                injectedJavaScript={injectedResolutionScript}
                onLoadStart={() => {
                  if (!hasFullscreenLoadFinished) {
                    setIsFullscreenLoading(true);
                  }
                }}
                onLoadEnd={() => {
                  setIsFullscreenLoading(false);
                  if (!hasFullscreenLoadFinished) {
                    setHasFullscreenLoadFinished(true);
                  }
                }}
                onMessage={handleWebViewMessage}
                onError={() => {
                  if (!tryNextSource()) {
                    setIsFullscreenLoading(false);
                  }
                }}
                onHttpError={() => {
                  if (!tryNextSource()) {
                    setIsFullscreenLoading(false);
                  }
                }}
                style={{ flex: 1, backgroundColor: isDark ? "#102116" : colors.background }}
              />
            </View>
          ) : null}
          {isFullscreenLoading ? (
            <View className="absolute inset-0 items-center justify-center" style={{ backgroundColor: overlayColor }}>
              <View className="rounded-full px-4 py-2 flex-row items-center gap-2" style={{ backgroundColor: chromeColor }}>
                <ActivityIndicator color={colors.accent} size="small" />
                <Text className="text-xs font-outfit" style={{ color: colors.text }}>Loading video…</Text>
              </View>
            </View>
          ) : null}
          <Pressable
            onPress={() => setFullscreenRotation((prev) => (prev + 90) % 360)}
            className="absolute top-12 left-4 h-12 w-12 rounded-full items-center justify-center border"
            style={({ pressed }) => ({
              backgroundColor: chromeColor,
              borderColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(15,23,42,0.08)",
              opacity: pressed ? 0.85 : 1,
              transform: [{ scale: pressed ? 0.96 : 1 }],
            })}
            accessibilityLabel="Rotate fullscreen video"
          >
            <Feather name="rotate-cw" size={20} color={colors.accent} />
          </Pressable>
          <Pressable
            onPress={() => setIsFullscreenOpen(false)}
            className="absolute top-12 right-4 h-12 w-12 rounded-full items-center justify-center border"
            style={({ pressed }) => ({
              backgroundColor: chromeColor,
              borderColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(15,23,42,0.08)",
              opacity: pressed ? 0.85 : 1,
              transform: [{ scale: pressed ? 0.96 : 1 }],
            })}
            accessibilityLabel="Close fullscreen"
          >
            <Feather name="x" size={20} color={colors.accent} />
          </Pressable>
        </View>
      </Modal>
    </View>
  );
}

export function VideoPlayer({
  uri,
  title,
  autoPlay = false,
  initialMuted = false,
  isLooping = false,
  posterUri,
  height = 220,
  useVideoResolution = true,
  immersive = false,
}: {
  uri: string;
  title?: string;
  autoPlay?: boolean;
  initialMuted?: boolean;
  isLooping?: boolean;
  posterUri?: string | null;
  height?: number;
  useVideoResolution?: boolean;
  immersive?: boolean;
}) {
  const { colors, isDark } = useAppTheme();
  const videoViewRef = useRef<any>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const hasFadeInRef = useRef(false);
  const pendingPlayRef = useRef(false);
  const playRetryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastPositionRef = useRef(0);
  const stallMsRef = useRef(0);
  const resolutionRatioRef = useRef<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isBuffering, setIsBuffering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(initialMuted);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [positionSec, setPositionSec] = useState(0);
  const [durationSec, setDurationSec] = useState(0);
  const [hasPlaybackRequest, setHasPlaybackRequest] = useState(autoPlay);
  const [containerWidth, setContainerWidth] = useState(0);
  const [videoAspectRatio, setVideoAspectRatio] = useState<number | null>(null);
  const [videoResolution, setVideoResolution] = useState<{ width: number; height: number } | null>(null);
  const normalizedUri = useMemo(() => normalizeUrl(uri), [uri]);
  const chromeColor = isDark ? "rgba(12,28,18,0.82)" : "rgba(255,255,255,0.9)";
  const overlayColor = isDark ? "rgba(16,33,22,0.64)" : "rgba(15,23,42,0.18)";
  const frameBackground = immersive ? (isDark ? "#09110c" : "#08140d") : colors.cardElevated;
  const frameBorderColor = isDark ? "rgba(255,255,255,0.08)" : "rgba(5,46,22,0.08)";
  const controlSurfaceColor = immersive
    ? isDark
      ? "rgba(6,16,10,0.84)"
      : "rgba(255,255,255,0.92)"
    : chromeColor;
  const heroBadgeColor = isDark ? "rgba(12,28,18,0.74)" : "rgba(255,255,255,0.86)";
  const qualityLabel = useMemo(() => {
    if (!videoResolution) return "Adaptive";
    return `${getResolutionLabel(videoResolution.width, videoResolution.height)} · ${videoResolution.width}×${videoResolution.height}`;
  }, [videoResolution]);
  const fitMode = useMemo(() => {
    if (useVideoResolution) return "contain" as const;
    if (videoAspectRatio && videoAspectRatio < 1) return "contain" as const;
    return "cover" as const;
  }, [useVideoResolution, videoAspectRatio]);
  const triggerFadeIn = useCallback(() => {
    if (hasFadeInRef.current) return;
    hasFadeInRef.current = true;
    setIsLoading(false);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const source = useMemo(() => ({ uri: normalizedUri }), [normalizedUri]);
  const player = useVideoPlayer(source, (instance) => {
    instance.loop = isLooping;
    instance.muted = initialMuted;
    if (autoPlay) {
      instance.play();
    }
  });

  useEffect(() => {
    return () => {
      try {
        (player as any)?.pause?.();
      } catch {
        // noop: player may already be released
      }
    };
  }, [player]);

  useEffect(() => {
    try {
      player.loop = isLooping;
    } catch {
      // player may already be released
    }
  }, [isLooping, player]);

  useEffect(() => {
    try {
      player.muted = isMuted;
    } catch {
      // player may already be released
    }
  }, [isMuted, player]);

  useEffect(() => {
    setIsLoading(true);
    setError(null);
    setPositionSec(0);
    setDurationSec(0);
    setIsBuffering(false);
    setHasPlaybackRequest(autoPlay);
    hasFadeInRef.current = false;
    fadeAnim.setValue(0);
    lastPositionRef.current = 0;
    stallMsRef.current = 0;
    pendingPlayRef.current = false;
    resolutionRatioRef.current = null;
    setVideoAspectRatio(null);
    setVideoResolution(null);
  }, [autoPlay, fadeAnim, normalizedUri]);

  useEffect(() => {
    return () => {
      if (playRetryTimeoutRef.current) {
        clearTimeout(playRetryTimeoutRef.current);
      }
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (loadTimeoutRef.current) {
      clearTimeout(loadTimeoutRef.current);
      loadTimeoutRef.current = null;
    }
    if (error || isPlaying || durationSec > 0 || !hasPlaybackRequest) {
      return;
    }
    loadTimeoutRef.current = setTimeout(() => {
      if (!isPlaying && durationSec <= 0 && !error) {
        setError("Unable to play this video here. Tap to open.");
      }
    }, 10000);
    return () => {
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
        loadTimeoutRef.current = null;
      }
    };
  }, [durationSec, error, hasPlaybackRequest, isPlaying]);

  useEffect(() => {
    const statusSub = (player as any)?.addListener?.("statusChange", (payload: any) => {
      if (payload?.error) {
        setError("Unable to play video. Tap to open.");
        setIsLoading(false);
      }
      const nextStatus = String(payload?.status ?? "");
      if (nextStatus.toLowerCase().includes("ready")) {
        triggerFadeIn();
        if (pendingPlayRef.current) {
          (player as any)?.play?.();
        }
      }
      if (nextStatus.toLowerCase().includes("buffer")) {
        setIsBuffering(true);
      }
    });
    const playingSub = (player as any)?.addListener?.("playingChange", (payload: any) => {
      const nextPlaying = Boolean(payload?.isPlaying ?? (player as any)?.playing);
      if (nextPlaying) {
        pendingPlayRef.current = false;
        triggerFadeIn();
      }
      setIsPlaying(nextPlaying);
    });
    return () => {
      statusSub?.remove?.();
      playingSub?.remove?.();
    };
  }, [player, triggerFadeIn]);

  useEffect(() => {
    const ticker = setInterval(() => {
      const nextDuration = Number((player as any)?.duration ?? 0);
      const nextPosition = Number((player as any)?.currentTime ?? 0);
      const nextPlaying = Boolean((player as any)?.playing);
      if (Number.isFinite(nextDuration) && nextDuration > 0) {
        setDurationSec(nextDuration);
        triggerFadeIn();
      }
      if (Number.isFinite(nextPosition)) {
        setPositionSec(nextPosition);
        if (nextPosition > 0.01) {
          triggerFadeIn();
        }
      }
      setIsPlaying(nextPlaying);
      const activeTrack = (player as any)?.videoTrack ?? (player as any)?.availableVideoTracks?.[0];
      const trackWidth = Number(activeTrack?.size?.width ?? 0);
      const trackHeight = Number(activeTrack?.size?.height ?? 0);
      if (trackWidth > 0 && trackHeight > 0) {
        setVideoResolution((prev) =>
          prev?.width === trackWidth && prev?.height === trackHeight
            ? prev
            : { width: trackWidth, height: trackHeight },
        );
        const ratio = trackWidth / trackHeight;
        if (Number.isFinite(ratio) && ratio > 0.2 && ratio < 5) {
          const previousRatio = resolutionRatioRef.current ?? 0;
          if (Math.abs(previousRatio - ratio) > 0.01) {
            resolutionRatioRef.current = ratio;
            setVideoAspectRatio(ratio);
          }
        }
      }

      if (nextPlaying && nextDuration > 0) {
        const delta = Math.abs(nextPosition - lastPositionRef.current);
        if (delta < 0.01 && nextPosition < nextDuration - 0.35) {
          stallMsRef.current += 250;
          if (stallMsRef.current > 1000) setIsBuffering(true);
        } else {
          stallMsRef.current = 0;
          setIsBuffering(false);
        }
      } else {
        stallMsRef.current = 0;
        setIsBuffering(false);
      }
      lastPositionRef.current = nextPosition;
    }, 250);

    return () => clearInterval(ticker);
  }, [player, triggerFadeIn]);

  const onContainerLayout = useCallback((event: LayoutChangeEvent) => {
    setContainerWidth(event.nativeEvent.layout.width);
  }, []);

  const resolvedHeight = useMemo(() => {
    if (!useVideoResolution || !containerWidth || !videoAspectRatio) {
      return height;
    }
    const calculatedHeight = Math.round(containerWidth / videoAspectRatio);
    return Math.max(180, Math.min(460, calculatedHeight));
  }, [containerWidth, height, useVideoResolution, videoAspectRatio]);

  const progress = durationSec > 0 ? Math.min(1, Math.max(0, positionSec / durationSec)) : 0;

  const formatTime = (secondsInput: number) => {
    const totalSeconds = Math.floor(Math.max(0, secondsInput));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${String(seconds).padStart(2, "0")}`;
  };

  const showPoster =
    !autoPlay &&
    !error &&
    !hasPlaybackRequest &&
    !isPlaying &&
    positionSec <= 0 &&
    durationSec <= 0;

  const togglePlayback = useCallback(async () => {
    if (error) {
      Linking.openURL(normalizedUri).catch(() => undefined);
      return;
    }
    if (showPoster) {
      setHasPlaybackRequest(true);
      pendingPlayRef.current = true;
      (player as any)?.play?.();
      if (playRetryTimeoutRef.current) {
        clearTimeout(playRetryTimeoutRef.current);
      }
      playRetryTimeoutRef.current = setTimeout(() => {
        if (pendingPlayRef.current) {
          (player as any)?.play?.();
        }
      }, 350);
      return;
    }
    if (isPlaying) {
      pendingPlayRef.current = false;
      (player as any)?.pause?.();
      return;
    }
    setHasPlaybackRequest(true);
    pendingPlayRef.current = true;
    (player as any)?.play?.();
  }, [error, isPlaying, normalizedUri, player, showPoster]);

  const seekBy = useCallback((deltaSeconds: number) => {
    if (!durationSec) {
      return;
    }
    const target = Math.max(0, Math.min(durationSec, positionSec + deltaSeconds));
    (player as any).currentTime = target;
  }, [durationSec, player, positionSec]);

  const toggleMute = useCallback(() => {
    const next = !isMuted;
    setIsMuted(next);
    (player as any).muted = next;
  }, [isMuted, player]);

  const openFullscreen = useCallback(async () => {
    try {
      const entered = await videoViewRef.current?.enterFullscreen?.();
      if (entered === undefined) {
        Linking.openURL(normalizedUri).catch(() => undefined);
      }
    } catch {
      Linking.openURL(normalizedUri).catch(() => undefined);
    }
  }, [normalizedUri]);

  return (
    <View
      className={`overflow-hidden border border-app/10 bg-card-elevated ${immersive ? "rounded-none" : "rounded-[24px]"}`}
      style={{ backgroundColor: frameBackground, borderColor: frameBorderColor, borderWidth: immersive ? 0 : 1 }}
      onLayout={useVideoResolution ? onContainerLayout : undefined}
    >
      {immersive ? (
        <>
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              top: -48,
              right: -32,
              width: 160,
              height: 160,
              borderRadius: 999,
              backgroundColor: colors.accent,
              opacity: isDark ? 0.18 : 0.14,
              zIndex: 0,
            }}
          />
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              bottom: -60,
              left: -24,
              width: 170,
              height: 170,
              borderRadius: 999,
              backgroundColor: colors.accentLight,
              opacity: isDark ? 0.22 : 0.8,
              zIndex: 0,
            }}
          />
        </>
      ) : null}

      <Animated.View style={{ opacity: fadeAnim }}>
        <VideoView
          key={normalizedUri}
          ref={videoViewRef}
          player={player}
          style={{ width: "100%" as any, height: resolvedHeight }}
          nativeControls={false}
          contentFit={fitMode}
          fullscreenOptions={{ enable: true }}
          allowsPictureInPicture
        />
      </Animated.View>

      <View className="absolute top-3 left-3 flex-row items-center gap-2">
        {immersive ? (
          <View className="rounded-full px-3 py-1.5" style={{ backgroundColor: heroBadgeColor }}>
            <Text className="text-[10px] font-outfit font-bold uppercase tracking-[1.4px]" style={{ color: colors.accent }}>
              Intro film
            </Text>
          </View>
        ) : null}
        {!immersive ? (
          <View className="rounded-full px-3 py-1.5" style={{ backgroundColor: chromeColor }}>
            <Text className="text-[10px] font-outfit font-bold uppercase tracking-[1.2px]" style={{ color: colors.accent }}>
              {qualityLabel}
            </Text>
          </View>
        ) : null}
        {!immersive && useVideoResolution ? (
          <View className="rounded-full px-3 py-1.5" style={{ backgroundColor: chromeColor }}>
            <Text className="text-[10px] font-outfit font-semibold" style={{ color: colors.text }}>
              Full frame
            </Text>
          </View>
        ) : null}
        {immersive ? (
          <View className="rounded-full px-3 py-1.5" style={{ backgroundColor: heroBadgeColor }}>
            <Text className="text-[10px] font-outfit font-semibold" style={{ color: colors.text }}>
              Fullscreen ready
            </Text>
          </View>
        ) : null}
      </View>

      {showPoster ? (
        <Pressable onPress={togglePlayback} className="absolute inset-0">
          {posterUri ? (
            <Image source={{ uri: posterUri }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
          ) : (
            <View className="flex-1 items-center justify-center bg-secondary/40" />
          )}

          <View
            pointerEvents="none"
            className="absolute inset-0"
            style={{ backgroundColor: immersive ? "rgba(4,12,8,0.3)" : overlayColor }}
          />

          {immersive ? (
            <View className="rounded-full px-3 py-1.5" style={{ backgroundColor: chromeColor }}>
              <Text className="text-[10px] font-outfit font-semibold" style={{ color: colors.text }}>
                Coach welcome
              </Text>
            </View>
          ) : null}

          <View className="absolute inset-0 items-center justify-center">
            {immersive ? (
              <View className="items-center gap-4">
                <View
                  className="h-24 w-24 items-center justify-center rounded-full border"
                  style={{
                    backgroundColor: "rgba(255,255,255,0.14)",
                    borderColor: "rgba(255,255,255,0.22)",
                  }}
                >
                  <View
                    className="h-16 w-16 items-center justify-center rounded-full"
                    style={{ backgroundColor: controlSurfaceColor }}
                  >
                    <Feather name="play" size={30} color={colors.accent} style={{ marginLeft: 3 }} />
                  </View>
                </View>
                <View className="items-center">
                  <Text className="text-lg font-clash font-bold text-white">Watch the welcome</Text>
                  <Text className="mt-1 text-xs font-outfit uppercase tracking-[2px] text-white/80">
                    Tap to start the intro experience
                  </Text>
                </View>
              </View>
            ) : (
              <View className="h-20 w-20 items-center justify-center rounded-full" style={{ backgroundColor: chromeColor }}>
                <Feather name="play" size={34} color="#fff" />
              </View>
            )}
          </View>

          {immersive ? (
            <View className="absolute bottom-5 left-5 right-5 flex-row items-center justify-between rounded-[22px] border px-4 py-3"
              style={{
                backgroundColor: "rgba(6,16,10,0.66)",
                borderColor: "rgba(255,255,255,0.12)",
              }}
            >
              <View className="flex-1 pr-4">
                <Text className="text-sm font-outfit font-semibold text-white">A polished first look</Text>
                <Text className="mt-1 text-xs font-outfit leading-5 text-white/75">
                  Personal, clean, and built to feel premium from the first second.
                </Text>
              </View>
              <Feather name="star" size={18} color="#fff" />
            </View>
          ) : null}
        </Pressable>
      ) : null}

      {!showPoster ? (
        <Pressable className="absolute inset-0" onPress={togglePlayback}>
          <View className="flex-1 items-center justify-center">
            {isLoading || isBuffering ? (
              <View className="rounded-full px-4 py-2" style={{ backgroundColor: chromeColor }}>
                <View className="flex-row items-center gap-2">
                  <ActivityIndicator color={colors.accent} />
                  <Text className="text-xs font-outfit" style={{ color: colors.text }}>
                    {isLoading ? "Loading video..." : "Buffering..."}
                  </Text>
                </View>
              </View>
            ) : null}
          </View>
        </Pressable>
      ) : null}

      {!showPoster ? (
        <View className="absolute inset-0 items-center justify-center">
          {error ? (
            <Pressable
              onPress={() => Linking.openURL(normalizedUri).catch(() => undefined)}
              className="rounded-full px-4 py-2"
              style={({ pressed }) => ({
                backgroundColor: chromeColor,
                opacity: pressed ? 0.9 : 1,
                transform: [{ scale: pressed ? 0.98 : 1 }],
              })}
            >
              <Text className="text-sm font-outfit" style={{ color: colors.text }}>{error}</Text>
            </Pressable>
          ) : (
            <Pressable
              onPress={togglePlayback}
              className={`items-center justify-center rounded-full ${immersive ? "h-20 w-20 border" : "h-16 w-16"}`}
              accessibilityLabel={isPlaying ? "Pause video" : "Play video"}
              style={({ pressed }) => ({
                backgroundColor: controlSurfaceColor,
                borderColor: immersive ? "rgba(255,255,255,0.14)" : "transparent",
                opacity: pressed ? 0.9 : 1,
                transform: [{ scale: pressed ? 0.96 : 1 }],
              })}
            >
              <Feather name={isPlaying ? "pause" : "play"} size={immersive ? 30 : 28} color={colors.accent} />
            </Pressable>
          )}
        </View>
      ) : null}

      {!showPoster ? (
        <View
          className={`absolute left-0 right-0 px-4 ${immersive ? "bottom-4" : "bottom-0 py-3"}`}
          style={
            immersive
              ? undefined
              : { backgroundColor: controlSurfaceColor }
          }
        >
          <View
            className={`${immersive ? "rounded-[24px] border px-4 py-4" : ""}`}
            style={
              immersive
                ? {
                    backgroundColor: "rgba(6,16,10,0.7)",
                    borderColor: "rgba(255,255,255,0.12)",
                  }
                : undefined
            }
          >
          <View className="mb-3 flex-row items-center justify-between">
            {immersive ? (
              <View className="rounded-full px-3 py-1.5" style={{ backgroundColor: "rgba(255,255,255,0.1)" }}>
                <Text className="text-[10px] font-outfit font-bold uppercase tracking-[1.6px] text-white">
                  {isPlaying ? "Now playing" : "Ready to play"}
                </Text>
              </View>
            ) : <View />}
            <Text className="text-xs font-outfit" style={{ color: immersive ? "rgba(255,255,255,0.82)" : colors.text }}>
              {formatTime(positionSec)} / {formatTime(durationSec)}
            </Text>
          </View>
          <View className="mb-3 h-1.5 w-full rounded-full" style={{ backgroundColor: immersive ? "rgba(255,255,255,0.16)" : isDark ? "rgba(255,255,255,0.18)" : "rgba(15,23,42,0.12)" }}>
            <View
              className="h-1.5 rounded-full"
              style={{ backgroundColor: colors.accent, width: `${Math.round(progress * 100)}%` }}
            />
          </View>
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-4">
              <Pressable
                onPress={() => seekBy(-10)}
                accessibilityLabel="Rewind 10 seconds"
                hitSlop={10}
                style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })}
              >
                <Feather name="rotate-ccw" size={20} color={immersive ? "#fff" : colors.accent} />
              </Pressable>
              <Pressable
                onPress={togglePlayback}
                accessibilityLabel={isPlaying ? "Pause video" : "Play video"}
                hitSlop={10}
                style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })}
              >
                <Feather name={isPlaying ? "pause-circle" : "play-circle"} size={26} color={immersive ? "#fff" : colors.accent} />
              </Pressable>
              <Pressable
                onPress={() => seekBy(10)}
                accessibilityLabel="Forward 10 seconds"
                hitSlop={10}
                style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })}
              >
                <Feather name="rotate-cw" size={20} color={immersive ? "#fff" : colors.accent} />
              </Pressable>
              <Pressable
                onPress={toggleMute}
                accessibilityLabel={isMuted ? "Unmute video" : "Mute video"}
                hitSlop={10}
                style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })}
              >
                <Feather name={isMuted ? "volume-x" : "volume-2"} size={20} color={immersive ? "#fff" : colors.accent} />
              </Pressable>
              <Pressable
                onPress={openFullscreen}
                accessibilityLabel="Open fullscreen"
                hitSlop={10}
                style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })}
              >
                <Feather name="maximize" size={20} color={immersive ? "#fff" : colors.accent} />
              </Pressable>
            </View>
          </View>
          </View>
        </View>
      ) : null}

      {title && !immersive ? (
        <View className="absolute top-3 right-3 rounded-full px-3 py-1" style={{ backgroundColor: chromeColor, maxWidth: "58%" }}>
          <Text className="text-xs font-outfit" style={{ color: colors.text }} numberOfLines={1}>{title}</Text>
        </View>
      ) : null}

      {showPoster ? (
        <View className="absolute bottom-0 left-0 right-0 px-3 py-2" style={{ backgroundColor: chromeColor }}>
          <Text className="text-xs font-outfit" style={{ color: colors.text }}>
            {immersive ? "Tap to begin the intro" : "Tap to play"}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
