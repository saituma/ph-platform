import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import { Play, RotateCcw } from "lucide-react-native";
import { Text } from "@/components/ScaledText";

const formatDuration = (value: number) => `${Math.floor(value / 60)}:${String(Math.floor(value % 60)).padStart(2, "0")}`;
export const IntroVideoPoster = React.memo(function IntroVideoPoster({ posterUrl, loading, replay, duration, onPress }: { posterUrl: string | null; loading?: boolean; replay?: boolean; duration?: number; onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={loading ? "Video loading" : replay ? "Replay video" : "Play video"} disabled={loading} onPress={onPress} style={({ pressed }) => [styles.fill, { opacity: pressed ? 0.92 : 1 }]}>
    {posterUrl ? <Image source={{ uri: posterUrl }} style={styles.fill} contentFit="cover" cachePolicy="memory-disk" transition={140} /> : <View style={[styles.fill, styles.fallback]} />}
    <View style={[styles.fill, styles.scrim]} />
    <View style={styles.playCircle}>{loading ? <ActivityIndicator color="#FFF" /> : replay ? <RotateCcw size={28} color="#FFF" /> : <Play size={30} color="#FFF" fill="#FFF" style={{ marginLeft: 3 }} />}</View>
    {duration && duration > 0 ? <Text style={styles.duration}>{formatDuration(duration)}</Text> : null}
    <Text style={styles.action}>{loading ? "Loading video" : replay ? "Watch again" : "Play with sound"}</Text>
  </Pressable>;
});
const styles = StyleSheet.create({
  fill: { ...StyleSheet.absoluteFillObject }, fallback: { backgroundColor: "#111612" }, scrim: { backgroundColor: "rgba(0,0,0,0.32)" },
  playCircle: { position: "absolute", alignSelf: "center", top: "50%", marginTop: -32, width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(8,12,9,0.72)", borderWidth: 1, borderColor: "rgba(255,255,255,0.34)" },
  action: { position: "absolute", alignSelf: "center", top: "50%", marginTop: 43, color: "#FFF", fontFamily: "Outfit-Medium", fontSize: 13 },
  duration: { position: "absolute", right: 12, bottom: 12, color: "#FFF", fontFamily: "Outfit-Bold", fontSize: 12, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: "rgba(0,0,0,0.72)" },
});
