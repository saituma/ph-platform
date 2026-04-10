import React, { useState, useRef, useMemo } from "react";
import {
  View,
  Pressable,
  Image,
  ActivityIndicator,
  Linking,
  StyleSheet,
} from "react-native";
import YoutubePlayer from "react-native-youtube-iframe";
import { Text } from "@/components/ScaledText";
import { useAppTheme } from "@/app/theme/AppThemeProvider";

const absoluteFillObject = StyleSheet.absoluteFillObject;

export const normalizeUrl = (url: string) => String(url ?? "").trim();

export const isYoutubeUrl = (url?: string) =>
  /youtube\.com|youtu\.be/i.test(normalizeUrl(url ?? ""));

export const extractYoutubeVideoId = (url?: string) => {
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

export const getYoutubePosterUrl = (url?: string) => {
  const videoId = extractYoutubeVideoId(url);
  return videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : null;
};

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
  { url, shouldPlay = true, initialMuted = false, onPlayerReady, onPlayerStateChange },
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
