import { useState, useEffect, useCallback, useRef } from "react";
import { AppState, Animated } from "react-native";
import { useVideoPlayer } from "expo-video";
import { useEventListener } from "expo";

const PROFESSIONAL_BUFFER_OPTIONS = {
  preferredForwardBufferDuration: 45,
  minBufferForPlayback: 5,
  waitsToMinimizeStalling: true,
} as const;

interface VideoPlayerEngineParams {
  sourceUri: string;
  autoPlay: boolean;
  initialMuted: boolean;
  isLooping: boolean;
  effectiveShouldPlay: boolean;
  isVisible: boolean;
  onDurationMs?: (durationMs: number) => void;
  onEnded?: (params: { position: number; duration: number }) => void;
  fadeAnim: Animated.Value;
}

export function useVideoPlayerEngine({
  sourceUri,
  autoPlay,
  initialMuted,
  isLooping,
  effectiveShouldPlay,
  isVisible,
  onDurationMs,
  onEnded,
  fadeAnim,
}: VideoPlayerEngineParams) {
  const player = useVideoPlayer(sourceUri, (instance) => {
    instance.loop = isLooping;
    instance.muted = initialMuted;
    instance.staysActiveInBackground = false;
    if ("bufferOptions" in instance) {
      (instance as any).bufferOptions = { ...PROFESSIONAL_BUFFER_OPTIONS };
    }
    if (autoPlay && effectiveShouldPlay) instance.play();
  });

  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [isMuted, setIsMuted] = useState(initialMuted);
  const [isLoading, setIsLoading] = useState(true);
  const [isBuffering, setIsBuffering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);
  const [resolution, setResolution] = useState<{ width: number; height: number } | null>(null);
  const [aspectRatio, setAspectRatio] = useState<number | null>(null);

  const safePause = useCallback(() => {
    try { player.pause(); } catch {}
  }, [player]);

  const safePlay = useCallback(() => {
    try { player.play(); } catch {}
  }, [player]);

  useEffect(() => {
    return () => { safePause(); };
  }, [safePause]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (next) => {
      if (next !== "active") safePause();
    });
    return () => sub.remove();
  }, [safePause]);

  useEventListener(player, "videoTrackChange", (e) => {
    const w = e.videoTrack?.size?.width ?? 0;
    const h = e.videoTrack?.size?.height ?? 0;
    if (w > 0 && h > 0) {
      setResolution({ width: w, height: h });
      setAspectRatio(w / h);
    }
  });

  useEventListener(player, "sourceLoad", (payload) => {
    if (payload.duration > 0) {
      setIsLoading(false);
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
    }
  });

  useEventListener(player, "statusChange", (e) => {
    if (e.status === "readyToPlay") {
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
      setIsLoading(false);
    }
    if (e.status === "error") {
      setError("Unable to play video. Tap to open externally.");
      setIsLoading(false);
    }
    setIsBuffering(e.status === "loading");
  });

  useEventListener(player, "playingChange", (e) => setIsPlaying(e.isPlaying ?? false));

  useEffect(() => {
    const id = setInterval(() => {
      try {
        setPosition(player.currentTime ?? 0);
        setDuration(player.duration ?? 0);
      } catch {
        setPosition(0);
        setDuration(0);
      }
    }, 400);
    return () => clearInterval(id);
  }, [player]);

  const lastDurationRef = useRef(0);
  useEffect(() => {
    if (!onDurationMs || !duration || duration === lastDurationRef.current) return;
    lastDurationRef.current = duration;
    onDurationMs(duration * 1000);
  }, [duration, onDurationMs]);

  const endedRef = useRef(false);
  useEffect(() => {
    endedRef.current = false;
  }, [sourceUri]);

  useEffect(() => {
    if (!onEnded || !duration || duration <= 0) return;
    if (position < Math.max(0, duration - 0.35)) {
      endedRef.current = false;
      return;
    }
    if (endedRef.current) return;
    endedRef.current = true;
    onEnded({ position, duration });
  }, [duration, onEnded, position, sourceUri]);

  const toggleMute = useCallback(() => {
    const next = !isMuted;
    player.muted = next;
    setIsMuted(next);
  }, [isMuted, player]);

  return {
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
  };
}
