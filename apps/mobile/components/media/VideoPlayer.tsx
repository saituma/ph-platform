import React, { useCallback, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Linking, TouchableOpacity, View } from "react-native";
import { Video, ResizeMode, AVPlaybackStatus, AVPlaybackStatusSuccess } from "expo-av";
import { Feather } from "@expo/vector-icons";

const YOUTUBE_HOSTS = ["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be"];
import { Text } from "@/components/ScaledText";

const normalizeUrl = (url: string) => {
  if (!/^https?:\/\//i.test(url)) {
    return `https://${url}`;
  }
  return url;
};

const getYoutubeId = (url: string) => {
  const normalized = normalizeUrl(url);
  
  // youtu.be/VIDEO_ID
  const shortMatch = normalized.match(/youtu\.be\/([^?#/]+)/i);
  if (shortMatch) return shortMatch[1];

  // youtube.com/shorts/VIDEO_ID
  const shortsMatch = normalized.match(/\/shorts\/([^?#/]+)/i);
  if (shortsMatch) return shortsMatch[1];

  // youtube.com/watch?v=VIDEO_ID
  const watchMatch = normalized.match(/[?&]v=([^&#]+)/i);
  if (watchMatch) return watchMatch[1];

  return null;
};

export const isYoutubeUrl = (url?: string) => {
  if (!url) return false;
  const normalized = normalizeUrl(url);
  return /youtube\.com|youtu\.be/i.test(normalized);
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

export function VideoPlayer({
  uri,
  title,
  autoPlay = false,
  initialMuted = false,
}: {
  uri: string;
  title?: string;
  autoPlay?: boolean;
  initialMuted?: boolean;
}) {
  const videoRef = useRef<Video>(null);
  const [status, setStatus] = useState<AVPlaybackStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(initialMuted);

  const loadedStatus = useMemo(() => {
    if (!status || !("isLoaded" in status) || !status.isLoaded) {
      return null;
    }
    return status as AVPlaybackStatusSuccess;
  }, [status]);

  const isPlaying = Boolean(loadedStatus?.isPlaying);
  const durationMillis = loadedStatus?.durationMillis ?? 0;
  const positionMillis = loadedStatus?.positionMillis ?? 0;
  const progress = durationMillis > 0 ? Math.min(1, Math.max(0, positionMillis / durationMillis)) : 0;

  const formatTime = (millis: number) => {
    const totalSeconds = Math.floor(Math.max(0, millis) / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${String(seconds).padStart(2, "0")}`;
  };

  const togglePlayback = useCallback(async () => {
    if (!loadedStatus) {
      return;
    }
    if (loadedStatus.isPlaying) {
      await videoRef.current?.pauseAsync();
    } else {
      await videoRef.current?.playAsync();
    }
  }, [loadedStatus]);

  const seekBy = useCallback(async (deltaMillis: number) => {
    if (!loadedStatus) {
      return;
    }
    const target = Math.max(0, Math.min(durationMillis, positionMillis + deltaMillis));
    await videoRef.current?.setPositionAsync(target);
  }, [durationMillis, loadedStatus, positionMillis]);

  const toggleMute = useCallback(async () => {
    const next = !isMuted;
    setIsMuted(next);
    await videoRef.current?.setIsMutedAsync(next);
  }, [isMuted]);

  const openFullscreen = useCallback(async () => {
    try {
      await videoRef.current?.presentFullscreenPlayer();
    } catch {
      Linking.openURL(uri).catch(() => undefined);
    }
  }, [uri]);

  return (
    <View className="overflow-hidden rounded-2xl border border-app/10 bg-black">
      <Video
        ref={videoRef}
        source={{ uri }}
        resizeMode={ResizeMode.COVER}
        shouldPlay={autoPlay}
        isMuted={isMuted}
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
      <View className="absolute bottom-0 left-0 right-0 bg-black/70 px-3 py-2">
        <View className="mb-2 h-1.5 w-full rounded-full bg-white/20">
          <View
            className="h-1.5 rounded-full bg-white"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </View>
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-3">
            <TouchableOpacity onPress={() => seekBy(-10000)} accessibilityLabel="Rewind 10 seconds">
              <Feather name="rotate-ccw" size={16} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity onPress={togglePlayback} accessibilityLabel={isPlaying ? "Pause video" : "Play video"}>
              <Feather name={isPlaying ? "pause-circle" : "play-circle"} size={18} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => seekBy(10000)} accessibilityLabel="Forward 10 seconds">
              <Feather name="rotate-cw" size={16} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity onPress={toggleMute} accessibilityLabel={isMuted ? "Unmute video" : "Mute video"}>
              <Feather name={isMuted ? "volume-x" : "volume-2"} size={16} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity onPress={openFullscreen} accessibilityLabel="Open fullscreen">
              <Feather name="maximize" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
          <Text className="text-[0.6875rem] font-outfit text-white">
            {formatTime(positionMillis)} / {formatTime(durationMillis)}
          </Text>
        </View>
      </View>
      {title ? (
        <View className="absolute top-3 left-3 rounded-full bg-black/70 px-3 py-1">
          <Text className="text-xs font-outfit text-white">{title}</Text>
        </View>
      ) : null}
    </View>
  );
}
