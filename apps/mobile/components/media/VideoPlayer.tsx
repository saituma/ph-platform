import React, { useCallback, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Linking, Text, TouchableOpacity, View } from "react-native";
import { Video, ResizeMode, AVPlaybackStatus } from "expo-av";
import { Feather } from "@expo/vector-icons";

const YOUTUBE_HOSTS = ["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be"];

const normalizeUrl = (url: string) => {
  if (!/^https?:\/\//i.test(url)) {
    return `https://${url}`;
  }
  return url;
};

const getYoutubeId = (url: string) => {
  try {
    const parsed = new URL(normalizeUrl(url));
    if (parsed.hostname === "youtu.be") {
      return parsed.pathname.replace("/", "");
    }
    if (parsed.pathname.startsWith("/shorts/")) {
      return parsed.pathname.replace("/shorts/", "");
    }
    if (parsed.searchParams.get("v")) {
      return parsed.searchParams.get("v");
    }
    return null;
  } catch {
    return null;
  }
};

export const isYoutubeUrl = (url?: string) => {
  if (!url) return false;
  try {
    const parsed = new URL(normalizeUrl(url));
    return YOUTUBE_HOSTS.includes(parsed.hostname);
  } catch {
    return false;
  }
};

export function YouTubeEmbed({ url }: { url: string }) {
  const videoId = useMemo(() => getYoutubeId(url), [url]);

  if (!videoId) {
    return (
      <View className="rounded-2xl border border-app/10 bg-input px-4 py-4">
        <Text className="text-sm font-outfit text-secondary">Invalid YouTube link.</Text>
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
    <View className="overflow-hidden rounded-2xl border border-app/10 bg-input px-4 py-5">
      <Text className="text-sm font-outfit text-secondary mb-3">YouTube video</Text>
      <TouchableOpacity
        onPress={handleOpenYoutube}
        className="rounded-full bg-accent px-4 py-3 items-center"
      >
        <Text className="text-white text-sm font-outfit">Open in YouTube</Text>
      </TouchableOpacity>
    </View>
  );
}

export function VideoPlayer({ uri, title }: { uri: string; title?: string }) {
  const videoRef = useRef<Video>(null);
  const [status, setStatus] = useState<AVPlaybackStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isPlaying = Boolean(status && "isLoaded" in status && status.isLoaded && status.isPlaying);

  const togglePlayback = useCallback(async () => {
    const current = status;
    if (!current || !("isLoaded" in current) || !current.isLoaded) {
      return;
    }
    if (current.isPlaying) {
      await videoRef.current?.pauseAsync();
    } else {
      await videoRef.current?.playAsync();
    }
  }, [status]);

  return (
    <View className="overflow-hidden rounded-2xl border border-app/10 bg-black">
      <Video
        ref={videoRef}
        source={{ uri }}
        resizeMode={ResizeMode.COVER}
        onLoadStart={() => setIsLoading(true)}
        onReadyForDisplay={() => setIsLoading(false)}
        onError={(err) => {
          setError("Unable to play video. Tap to open.");
          setIsLoading(false);
        }}
        onPlaybackStatusUpdate={setStatus}
        useNativeControls={false}
        style={{ width: "100%", height: 220 }}
      />
      <View className="absolute inset-0 items-center justify-center">
        {isLoading ? (
          <ActivityIndicator color="#fff" />
        ) : error ? (
          <TouchableOpacity
            onPress={() => Linking.openURL(uri).catch(() => undefined)}
            className="rounded-full bg-black/60 px-4 py-2"
          >
            <Text className="text-white text-sm font-outfit">{error}</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={togglePlayback}
            className="h-14 w-14 items-center justify-center rounded-full bg-black/60"
            accessibilityLabel={isPlaying ? "Pause video" : "Play video"}
          >
            <Feather name={isPlaying ? "pause" : "play"} size={24} color="#fff" />
          </TouchableOpacity>
        )}
      </View>
      {title ? (
        <View className="absolute bottom-3 left-3 rounded-full bg-black/70 px-3 py-1">
          <Text className="text-xs font-outfit text-white">{title}</Text>
        </View>
      ) : null}
    </View>
  );
}
