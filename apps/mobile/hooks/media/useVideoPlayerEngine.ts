import { useState, useEffect, useCallback, useRef } from "react";
import { AppState, Animated } from "react-native";
import { useVideoPlayer } from "expo-video";
import { useEventListener } from "expo";

const BUFFER_OPTIONS = {
  preferredForwardBufferDuration: 15, // was 45 — start playing sooner, buffer less upfront
  minBufferForPlayback: 1,            // was 5 — start at 1s buffered instead of 5s
  waitsToMinimizeStalling: false,     // was true — don't wait for optimal buffer on slow connections
} as const;

const MAX_RETRIES = 3;
const RETRY_DELAYS_MS = [1500, 3000, 6000];

interface VideoPlayerEngineParams {
  sourceUri: string;
  autoPlay: boolean;
  initialMuted: boolean;
  isLooping: boolean;
  effectiveShouldPlay: boolean;
  isVisible: boolean;
  forceMuted?: boolean;
  onDurationMs?: (durationMs: number) => void;
  onEnded?: (params: { position: number; duration: number }) => void;
  fadeAnim: Animated.Value;
}

function normalizeRotation(value: unknown) {
  const raw = Number(value ?? 0);
  if (!Number.isFinite(raw)) return 0;
  const n = ((Math.trunc(raw) % 360) + 360) % 360;
  return n;
}

function ratioFromTrack(
  width: number,
  height: number,
  rotation: unknown,
): number | null {
  if (!(width > 0) || !(height > 0)) return null;
  const r = normalizeRotation(rotation);
  const rotationSuggestsSwap = r === 90 || r === 270;
  // Display size: swap W/H when the stream is tagged 90°/270° (common for phone portrait).
  const dw = rotationSuggestsSwap ? height : width;
  const dh = rotationSuggestsSwap ? width : height;
  const chosen = dw / dh;
  if (!(chosen > 0.2 && chosen < 5)) return null;
  return chosen;
}

export function useVideoPlayerEngine({
  sourceUri,
  autoPlay,
  initialMuted,
  isLooping,
  effectiveShouldPlay,
  isVisible,
  forceMuted = false,
  onDurationMs,
  onEnded,
  fadeAnim,
}: VideoPlayerEngineParams) {
  const player = useVideoPlayer(sourceUri, (instance) => {
    instance.loop = isLooping;
    instance.muted = forceMuted ? true : initialMuted;
    if (forceMuted) instance.volume = 0;
    instance.staysActiveInBackground = false;
    if ("bufferOptions" in instance) {
      (instance as any).bufferOptions = { ...BUFFER_OPTIONS };
    }
    if (autoPlay && effectiveShouldPlay) instance.play();
  });

  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [isMuted, setIsMuted] = useState(initialMuted);
  const [isLoading, setIsLoading] = useState(true);
  const [isBuffering, setIsBuffering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const retryCountRef = useRef(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);
  const [resolution, setResolution] = useState<{ width: number; height: number } | null>(null);
  const [aspectRatio, setAspectRatio] = useState<number | null>(null);

  useEffect(() => {
    setAspectRatio(null);
    setResolution(null);
    setError(null);
    setIsLoading(true);
    retryCountRef.current = 0;
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
  }, [sourceUri]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    };
  }, []);

  const safePause = useCallback(() => {
    try { player.pause(); } catch {}
  }, [player]);

  const safePlay = useCallback(() => {
    try {
      const dur = player.duration ?? 0;
      const cur = player.currentTime ?? 0;
      if (dur > 0 && cur >= dur - 0.5) {
        player.seekBy(-cur);
      }
      player.play();
    } catch {}
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
    const rotation =
      (e.videoTrack as any)?.rotationDegrees ??
      (e.videoTrack as any)?.rotation ??
      0;
    const nextRatio = ratioFromTrack(w, h, rotation);
    if (w > 0 && h > 0 && nextRatio) {
      setResolution({ width: w, height: h });
      setAspectRatio(nextRatio);
    }
  });

  useEventListener(player, "sourceLoad", (payload) => {
    const maybeWidth =
      Number((payload as any)?.videoSource?.size?.width) ||
      Number((payload as any)?.videoSource?.width) ||
      0;
    const maybeHeight =
      Number((payload as any)?.videoSource?.size?.height) ||
      Number((payload as any)?.videoSource?.height) ||
      0;
    const maybeRotation =
      (payload as any)?.videoSource?.rotationDegrees ??
      (payload as any)?.videoSource?.rotation ??
      0;
    const sourceRatio = ratioFromTrack(maybeWidth, maybeHeight, maybeRotation);
    if (maybeWidth > 0 && maybeHeight > 0 && sourceRatio) {
      setResolution((prev) => prev ?? { width: maybeWidth, height: maybeHeight });
      setAspectRatio(sourceRatio);
    }
    if (payload.duration > 0) {
      setDuration(payload.duration);
      setIsLoading(false);
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
    }
  });

  useEventListener(player, "statusChange", (e) => {
    if (e.status === "readyToPlay" || e.status === "loading") {
      retryCountRef.current = 0;
      Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
      setIsLoading(false);
      // Grab duration here too — covers HLS/streaming sources where sourceLoad may not fire
      const d = player.duration;
      if (typeof d === "number" && d > 0) setDuration(d);
    }
    // init callback's play() fires before the source is ready and is a no-op;
    // re-issue it once the player signals it's actually ready to play frames.
    if (e.status === "readyToPlay" && autoPlay && effectiveShouldPlay) {
      try { player.play(); } catch {}
    }
    if (e.status === "error") {
      if (retryCountRef.current < MAX_RETRIES) {
        const delay = RETRY_DELAYS_MS[retryCountRef.current] ?? 6000;
        retryCountRef.current += 1;
        retryTimerRef.current = setTimeout(() => {
          if (!isMountedRef.current) return;
          try {
            if (typeof (player as any).replaceAsync === "function") {
              (player as any).replaceAsync({ uri: sourceUri });
            } else {
              player.replace({ uri: sourceUri } as any);
            }
          } catch {
            if (isMountedRef.current) {
              try { player.replay(); } catch {}
            }
          }
        }, delay);
      } else {
        setError("Unable to play video. Tap to open externally.");
        setIsLoading(false);
      }
    }
    setIsBuffering(e.status === "loading");
  });

  useEventListener(player, "playingChange", (e) => setIsPlaying(e.isPlaying ?? false));

  // timeUpdate fires while playing — read player.duration here, which is
  // guaranteed non-zero once the player is actively playing frames.
  useEffect(() => {
    try { player.timeUpdateEventInterval = 0.5; } catch {}
  }, [player]);

  useEventListener(player, "timeUpdate", (e) => {
    setPosition(e.currentTime ?? 0);
    try {
      const d = player.duration;
      if (typeof d === "number" && d > 0) setDuration(d);
    } catch {}
  });

  // Fallback poll — keeps position in sync during buffering gaps when timeUpdate pauses.
  useEffect(() => {
    const id = setInterval(() => {
      try {
        const pos = player.currentTime ?? 0;
        const dur = player.duration ?? 0;
        setPosition(pos);
        if (dur > 0) setDuration(dur);
      } catch {}
    }, 500);
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

  // Hard-lock audio when forceMuted. The guard below is critical: setting volume/muted
  // itself fires volumeChange/mutedChange, so re-setting them unconditionally inside the
  // handler is an infinite loop that freezes the JS thread. We only mutate when the
  // values are actually wrong — so the event settles after at most one correction.
  const enforceMute = useCallback(() => {
    if (!forceMuted) return;
    if (player.muted === true && player.volume === 0) return;
    player.muted = true;
    player.volume = 0;
  }, [forceMuted, player]);

  useEffect(() => {
    enforceMute();
  }, [enforceMute]);

  useEventListener(player, "volumeChange", enforceMute);
  useEventListener(player, "mutedChange", enforceMute);

  const toggleMute = useCallback(() => {
    if (forceMuted) return;
    const next = !isMuted;
    player.muted = next;
    setIsMuted(next);
  }, [forceMuted, isMuted, player]);

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
