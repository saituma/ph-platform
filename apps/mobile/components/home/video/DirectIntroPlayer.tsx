import React, { useCallback, useEffect, useRef, useState } from "react";
import { AppState, Linking, Modal, Platform, Pressable, StyleSheet, View } from "react-native";
import { useEventListener } from "expo";
import { useVideoPlayer, VideoView, type VideoView as ExpoVideoView } from "expo-video";
import * as Haptics from "expo-haptics";
import { X } from "lucide-react-native";
import { Text } from "@/components/ScaledText";
import { IntroVideoControls } from "./IntroVideoControls";
import { IntroVideoPoster } from "./IntroVideoPoster";
import { clearIntroProgress, readIntroProgress, writeIntroProgress } from "./sessionProgress";
import {
  clampIntroSeek,
  isIntroEnded,
  retryDelayForAttempt,
  shouldShowIntroControls,
} from "@/lib/home/introPlaybackPolicy";

type Props = { url: string; posterUrl: string | null; accentColor: string; onAspectRatio: (ratio: number) => void };

export const DirectIntroPlayer = React.memo(function DirectIntroPlayer({ url, posterUrl, accentColor, onAspectRatio }: Props) {
  const videoRef = useRef<ExpoVideoView>(null);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryCount = useRef(0);
  const wasPlayingBeforeScrub = useRef(false);
  const controlTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const positionRef = useRef(readIntroProgress(url));
  const sourceReleased = useRef(false);
  const pendingPlay = useRef(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [firstFrame, setFirstFrame] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [fullscreenOpen, setFullscreenOpen] = useState(false);
  const [position, setPosition] = useState(positionRef.current);
  const [duration, setDuration] = useState(0);
  const [bufferedPosition, setBufferedPosition] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const player = useVideoPlayer({ uri: url, useCaching: true }, (instance) => {
    instance.loop = false; instance.muted = false; instance.staysActiveInBackground = false; instance.timeUpdateEventInterval = 0.25;
    instance.bufferOptions = { preferredForwardBufferDuration: 15, minBufferForPlayback: 1, waitsToMinimizeStalling: false };
  });

  const scheduleHide = useCallback(() => {
    if (controlTimer.current) clearTimeout(controlTimer.current);
    if (isPlaying) controlTimer.current = setTimeout(() => setControlsVisible(false), 2500);
  }, [isPlaying]);
  useEffect(() => { scheduleHide(); return () => { if (controlTimer.current) clearTimeout(controlTimer.current); }; }, [scheduleHide]);
  useEffect(() => { const sub = AppState.addEventListener("change", (state) => { if (state === "background") {
    writeIntroProgress(url, player.currentTime ?? positionRef.current);
    player.pause(); pendingPlay.current = false; sourceReleased.current = true;
    setHasStarted(false); setFirstFrame(false); setIsLoading(false);
    void player.replaceAsync(null).catch(() => {});
  } }); return () => sub.remove(); }, [player, url]);
  useEffect(() => () => {
    let last = positionRef.current;
    try { last = player.currentTime ?? last; player.pause(); } catch {}
    writeIntroProgress(url, last);
    if (retryTimer.current) clearTimeout(retryTimer.current);
  }, [player, url]);

  useEventListener(player, "sourceLoad", (event) => {
    if (event.duration > 0) setDuration(event.duration);
    const saved = readIntroProgress(url);
    if (saved > 0 && saved < event.duration - 0.5) { player.currentTime = saved; positionRef.current = saved; setPosition(saved); }
  });
  useEventListener(player, "videoTrackChange", (event) => {
    const width = event.videoTrack?.size?.width ?? 0; const height = event.videoTrack?.size?.height ?? 0;
    const rotation = Number((event.videoTrack as any)?.rotationDegrees ?? 0);
    if (width > 0 && height > 0) onAspectRatio(rotation === 90 || rotation === 270 ? height / width : width / height);
  });
  useEventListener(player, "timeUpdate", (event) => { const next = event.currentTime ?? 0; positionRef.current = next; setPosition(next); setBufferedPosition(event.bufferedPosition ?? 0); if (player.duration > 0) setDuration(player.duration); });
  useEventListener(player, "playingChange", (event) => setIsPlaying(event.isPlaying));
  useEventListener(player, "mutedChange", (event) => setIsMuted(event.muted));
  useEventListener(player, "statusChange", (event) => {
    setIsLoading(event.status === "loading");
    if (event.status === "readyToPlay") {
      setError(null);
      if (pendingPlay.current) {
        pendingPlay.current = false;
        const saved = readIntroProgress(url);
        if (saved > 0) player.currentTime = saved;
        player.play();
      }
    }
    if (event.status !== "error") return;
    setFirstFrame(false);
    const delay = retryDelayForAttempt(retryCount.current);
    if (delay != null) { setIsLoading(true); retryCount.current += 1; retryTimer.current = setTimeout(() => { void player.replaceAsync({ uri: url, useCaching: true }).catch(() => { setIsLoading(false); setError("Video unavailable"); }); }, delay); }
    else { setIsLoading(false); setError("Video unavailable"); }
  });

  const play = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setHasStarted(true); setControlsVisible(true); setIsLoading(true);
    if (sourceReleased.current) {
      sourceReleased.current = false; pendingPlay.current = true;
      void player.replaceAsync({ uri: url, useCaching: true }).catch(() => { pendingPlay.current = false; setError("Video unavailable"); });
    } else if (duration > 0 && position >= duration - 0.5) { clearIntroProgress(url); positionRef.current = 0; setPosition(0); player.replay(); } else player.play();
  }, [duration, player, position, url]);
  const togglePlay = useCallback(() => {
    setControlsVisible(true);
    if (duration > 0 && position >= duration - 0.5) { clearIntroProgress(url); positionRef.current = 0; setPosition(0); player.replay(); }
    else if (isPlaying) player.pause(); else player.play();
  }, [duration, isPlaying, player, position, url]);
  const handleStageTap = useCallback(() => { setControlsVisible((visible) => !visible); if (!controlsVisible) scheduleHide(); }, [controlsVisible, scheduleHide]);
  const seekStart = useCallback(() => { wasPlayingBeforeScrub.current = isPlaying; player.pause(); setControlsVisible(true); }, [isPlaying, player]);
  const seek = useCallback((seconds: number) => { const next = clampIntroSeek(seconds, duration); positionRef.current = next; setPosition(next); }, [duration]);
  const seekEnd = useCallback((seconds: number) => { player.currentTime = clampIntroSeek(seconds, duration); if (wasPlayingBeforeScrub.current) player.play(); }, [duration, player]);
  const isEnded = isIntroEnded(position, duration);

  if (error) return <View style={styles.error}><Text style={styles.errorTitle}>{error}</Text><View style={styles.errorActions}>
    <Pressable accessibilityRole="button" accessibilityLabel="Retry video" onPress={() => { retryCount.current = 0; setError(null); setFirstFrame(false); setIsLoading(true); void player.replaceAsync({ uri: url, useCaching: true }).catch(() => { setIsLoading(false); setError("Video unavailable"); }); }} style={styles.retry}><Text style={styles.retryText}>Retry</Text></Pressable>
    <Pressable accessibilityRole="link" accessibilityLabel="Open video externally" onPress={() => void Linking.openURL(url)} style={styles.external}><Text style={styles.externalText}>Open externally</Text></Pressable>
  </View></View>;

  return <View style={styles.fill}>
    {!fullscreenOpen && <VideoView ref={videoRef} player={player} style={styles.fill} contentFit="contain" nativeControls={false} fullscreenOptions={{ enable: false, orientation: "default" }} onFirstFrameRender={() => { retryCount.current = 0; setFirstFrame(true); setIsLoading(false); }} {...(Platform.OS === "android" ? { surfaceType: "textureView" as const } : {})} />}
    {(!hasStarted || (!firstFrame && isLoading) || isEnded) && <IntroVideoPoster posterUrl={posterUrl} loading={hasStarted && isLoading && !firstFrame} replay={isEnded} duration={duration} onPress={play} />}
    {hasStarted && firstFrame && !isEnded ? <Pressable accessibilityRole="button" accessibilityLabel="Show or hide video controls" onPress={handleStageTap} style={styles.fill} /> : null}
    {hasStarted && firstFrame && !isEnded && <IntroVideoControls visible={shouldShowIntroControls({ requestedVisible: controlsVisible, isPlaying, isLoading })} isPlaying={isPlaying} isMuted={isMuted} isEnded={isEnded} position={position} duration={duration} bufferedPosition={bufferedPosition} accentColor={accentColor} onTogglePlay={togglePlay} onToggleMute={() => { player.muted = !player.muted; }} onSeekStart={seekStart} onSeek={seek} onSeekEnd={seekEnd} onFullscreen={() => { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setFullscreenOpen(true); }} />}
    <Modal visible={fullscreenOpen} animationType="fade" onRequestClose={() => setFullscreenOpen(false)} supportedOrientations={["portrait", "landscape"]}>
      <View style={styles.fullscreenModal}>
        <Pressable accessibilityRole="button" accessibilityLabel="Exit fullscreen" onPress={() => setFullscreenOpen(false)} style={styles.fullscreenClose}>
          <X size={22} color="#FFF" />
        </Pressable>
        <VideoView player={player} style={styles.fill} contentFit="contain" nativeControls {...(Platform.OS === "android" ? { surfaceType: "textureView" as const } : {})} />
      </View>
    </Modal>
  </View>;
});
const styles = StyleSheet.create({ fill: { ...StyleSheet.absoluteFillObject }, fullscreenModal: { flex: 1, backgroundColor: "#000" }, fullscreenClose: { position: "absolute", top: 18, right: 18, zIndex: 20, width: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: 22, backgroundColor: "rgba(0,0,0,0.55)" }, error: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center", gap: 14, backgroundColor: "#111" }, errorTitle: { color: "#FFF", fontFamily: "Outfit-Bold", fontSize: 16 }, errorActions: { flexDirection: "row", alignItems: "center", gap: 8 }, retry: { minWidth: 88, minHeight: 44, paddingHorizontal: 18, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: "#FFF" }, retryText: { color: "#111", fontFamily: "Outfit-Bold", fontSize: 14 }, external: { minHeight: 44, paddingHorizontal: 14, alignItems: "center", justifyContent: "center" }, externalText: { color: "#FFF", fontFamily: "Outfit-Medium", fontSize: 13 } });
