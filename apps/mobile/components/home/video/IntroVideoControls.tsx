import React, { useMemo } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { runOnJS, useAnimatedStyle, useSharedValue } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { Maximize, Pause, Play, RotateCcw, Volume2, VolumeX } from "lucide-react-native";
import { Text } from "@/components/ScaledText";

type Props = { visible: boolean; isPlaying: boolean; isMuted: boolean; isEnded: boolean; position: number; duration: number; bufferedPosition?: number; accentColor: string; onTogglePlay: () => void; onToggleMute: () => void; onSeekStart: () => void; onSeek: (seconds: number) => void; onSeekEnd: (seconds: number) => void; onFullscreen: () => void };
const formatTime = (value: number) => { const seconds = Math.max(0, Math.floor(Number.isFinite(value) ? value : 0)); return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`; };
function ControlButton({ label, onPress, children }: { label: string; onPress: () => void; children: React.ReactNode }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} hitSlop={4} onPress={onPress} style={({ pressed }) => [styles.controlButton, { opacity: pressed ? 0.66 : 1 }]}>{children}</Pressable>;
}

export const IntroVideoControls = React.memo(function IntroVideoControls(props: Props) {
  const { visible, isPlaying, isMuted, isEnded, position, duration, bufferedPosition = 0, accentColor, onTogglePlay, onToggleMute, onSeekStart, onSeek, onSeekEnd, onFullscreen } = props;
  const trackWidth = useSharedValue(1);
  const scrubX = useSharedValue(0);
  const progress = duration > 0 ? Math.min(1, position / duration) : 0;
  const scrubGesture = useMemo(() => Gesture.Pan().minDistance(0)
    .onBegin((event) => { scrubX.value = Math.max(0, Math.min(trackWidth.value, event.x)); runOnJS(onSeekStart)(); })
    .onUpdate((event) => { scrubX.value = Math.max(0, Math.min(trackWidth.value, event.x)); runOnJS(onSeek)((scrubX.value / trackWidth.value) * duration); })
    .onFinalize(() => runOnJS(onSeekEnd)((scrubX.value / trackWidth.value) * duration)), [duration, onSeek, onSeekEnd, onSeekStart, scrubX, trackWidth]);
  const thumbStyle = useAnimatedStyle(() => ({ transform: [{ translateX: Math.max(0, trackWidth.value * progress - 7) }] }), [progress]);
  if (!visible) return null;
  const buffered = duration > 0 ? Math.max(0, Math.min(100, (bufferedPosition / duration) * 100)) : 0;
  return <View style={styles.overlay} pointerEvents="box-none">
    <LinearGradient colors={["transparent", "rgba(0,0,0,0.78)"]} locations={[0, 0.55]} style={styles.gradient} pointerEvents="none" />
    <View style={styles.content}>
      <GestureDetector gesture={scrubGesture}>
        <Animated.View accessibilityRole="adjustable" accessibilityLabel="Video progress" accessibilityValue={{ min: 0, max: Math.round(duration), now: Math.round(position), text: `${formatTime(position)} of ${formatTime(duration)}` }} onLayout={(event) => { trackWidth.value = Math.max(1, event.nativeEvent.layout.width); }} style={styles.seekTouchArea}>
          <View style={styles.track}><View style={[styles.buffered, { width: `${buffered}%` }]} /><View style={[styles.progress, { width: `${progress * 100}%`, backgroundColor: accentColor }]} /></View>
          <Animated.View style={[styles.thumb, { backgroundColor: accentColor }, thumbStyle]} />
        </Animated.View>
      </GestureDetector>
      <View style={styles.row}>
        <ControlButton label={isEnded ? "Replay video" : isPlaying ? "Pause video" : "Play video"} onPress={onTogglePlay}>{isEnded ? <RotateCcw size={21} color="#FFF" /> : isPlaying ? <Pause size={22} fill="#FFF" color="#FFF" /> : <Play size={22} fill="#FFF" color="#FFF" />}</ControlButton>
        <Text style={styles.time}>{formatTime(position)} / {formatTime(duration)}</Text><View style={styles.spacer} />
        <ControlButton label={isMuted ? "Unmute video" : "Mute video"} onPress={onToggleMute}>{isMuted ? <VolumeX size={21} color="#FFF" /> : <Volume2 size={21} color="#FFF" />}</ControlButton>
        <ControlButton label="Enter fullscreen" onPress={onFullscreen}><Maximize size={20} color="#FFF" /></ControlButton>
      </View>
    </View>
  </View>;
});
const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, justifyContent: "flex-end", zIndex: 30 }, gradient: { ...StyleSheet.absoluteFillObject, top: "28%" }, content: { paddingHorizontal: 10, paddingBottom: 7 }, seekTouchArea: { height: 30, justifyContent: "center" }, track: { height: 3, borderRadius: 2, overflow: "hidden", backgroundColor: "rgba(255,255,255,0.28)" }, buffered: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(255,255,255,0.42)" }, progress: { height: "100%" }, thumb: { position: "absolute", width: 14, height: 14, borderRadius: 7, top: 8 }, row: { height: 44, flexDirection: "row", alignItems: "center" }, controlButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center" }, time: { color: "#FFF", fontFamily: "Outfit-Medium", fontSize: 12, fontVariant: ["tabular-nums"] }, spacer: { flex: 1 },
});
