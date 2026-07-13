import React, { useCallback, useEffect, useRef, useState } from "react";
import { AppState, Linking, Pressable, StyleSheet, View } from "react-native";
import YoutubeIframe from "react-native-youtube-iframe";
import { WebView } from "react-native-webview";
import { ExternalLink } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { Text } from "@/components/ScaledText";
import { IntroVideoPoster } from "./IntroVideoPoster";
import { readIntroProgress, writeIntroProgress } from "./sessionProgress";
import { retryDelayForAttempt } from "@/lib/home/introPlaybackPolicy";

type Props = { kind: "youtube" | "loom"; url: string; posterUrl: string | null; width: number; height: number };
const youtubeId = (url: string) => url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/)?.[1] ?? "";
const loomEmbedUrl = (url: string) => { const id = url.match(/(?:share|embed)\/([A-Za-z0-9_-]+)/)?.[1]; const embed = id ? `https://www.loom.com/embed/${id}` : url; return `${embed}${embed.includes("?") ? "&" : "?"}autoplay=1`; };

export const EmbeddedIntroPlayer = React.memo(function EmbeddedIntroPlayer({ kind, url, posterUrl, width, height }: Props) {
  const youtubeRef = useRef<any>(null);
  const retryCount = useRef(0);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const revealTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [started, setStarted] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState(false);
  const [ended, setEnded] = useState(false);
  const [instanceKey, setInstanceKey] = useState(0);
  const [ready, setReady] = useState(false);
  useEffect(() => { if (kind !== "youtube" || !playing) return; const timer = setInterval(() => { void youtubeRef.current?.getCurrentTime?.().then((seconds: number) => writeIntroProgress(url, seconds)); }, 1000); return () => clearInterval(timer); }, [kind, playing, url]);
  useEffect(() => () => { if (retryTimer.current) clearTimeout(retryTimer.current); if (revealTimer.current) clearTimeout(revealTimer.current); if (kind === "youtube") { try { youtubeRef.current?.pauseVideo?.(); } catch {} void youtubeRef.current?.getCurrentTime?.().then((seconds: number) => writeIntroProgress(url, seconds)); } }, [kind, url]);
  useEffect(() => { const subscription = AppState.addEventListener("change", (state) => { if (state === "active") return; if (kind === "youtube") { void youtubeRef.current?.getCurrentTime?.().then((seconds: number) => writeIntroProgress(url, seconds)); try { youtubeRef.current?.pauseVideo?.(); } catch {} } setReady(false); setPlaying(false); setStarted(false); }); return () => subscription.remove(); }, [kind, url]);
  const handleReady = useCallback(() => { setError(false); if (kind === "loom") revealTimer.current = setTimeout(() => setReady(true), 350); }, [kind]);
  const handleError = useCallback(() => {
    const delay = retryDelayForAttempt(retryCount.current);
    if (delay == null) { setError(true); setReady(false); return; }
    retryCount.current += 1; setReady(false);
    retryTimer.current = setTimeout(() => setInstanceKey((value) => value + 1), delay);
  }, []);
  const retry = useCallback(() => { retryCount.current = 0; setError(false); setStarted(false); setPlaying(false); setEnded(false); setReady(false); setInstanceKey((value) => value + 1); }, []);
  if (error) return <View style={styles.error}><Text style={styles.errorTitle}>Video unavailable</Text><View style={styles.actions}><Pressable accessibilityRole="button" accessibilityLabel="Retry video" onPress={retry} style={styles.button}><Text style={styles.buttonText}>Retry</Text></Pressable><Pressable accessibilityRole="link" accessibilityLabel="Open video externally" onPress={() => void Linking.openURL(url)} style={styles.iconButton}><ExternalLink size={19} color="#FFF" /></Pressable></View></View>;
  if (!started) return <IntroVideoPoster posterUrl={posterUrl} replay={ended} onPress={() => { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setEnded(false); setStarted(true); setPlaying(true); }} />;
  if (kind === "youtube") return <View style={styles.fill}><YoutubeIframe key={instanceKey} ref={youtubeRef} videoId={youtubeId(url)} height={height} width={width} play={playing} initialPlayerParams={{ start: Math.floor(readIntroProgress(url)), controls: true, modestbranding: true }} onReady={() => { handleReady(); const saved = readIntroProgress(url); if (saved > 0) youtubeRef.current?.seekTo?.(saved, true); }} onChangeState={(state) => { setPlaying(state === "playing" || state === "buffering"); if (state === "playing") { retryCount.current = 0; setReady(true); } if (state === "ended") { writeIntroProgress(url, 0); setPlaying(false); setEnded(true); setStarted(false); } }} onError={handleError} webViewProps={{ allowsFullscreenVideo: true, mediaPlaybackRequiresUserAction: false }} />{!ready ? <IntroVideoPoster posterUrl={posterUrl} loading onPress={() => {}} /> : null}</View>;
  return <View style={styles.fill}><WebView key={instanceKey} source={{ uri: loomEmbedUrl(url) }} style={styles.webView} allowsFullscreenVideo allowsInlineMediaPlayback mediaPlaybackRequiresUserAction={false} javaScriptEnabled domStorageEnabled scrollEnabled={false} setSupportMultipleWindows={false} onLoad={handleReady} onError={handleError} originWhitelist={["https://www.loom.com", "https://loom.com", "https://*.loom.com"]} />{!ready ? <IntroVideoPoster posterUrl={posterUrl} loading onPress={() => {}} /> : null}</View>;
});
const styles = StyleSheet.create({ fill: { ...StyleSheet.absoluteFillObject, justifyContent: "center", backgroundColor: "#000" }, webView: { flex: 1, backgroundColor: "#000" }, error: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center", gap: 14, backgroundColor: "#111" }, errorTitle: { color: "#FFF", fontFamily: "Outfit-Bold", fontSize: 16 }, actions: { flexDirection: "row", gap: 8 }, button: { minHeight: 44, paddingHorizontal: 20, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: "#FFF" }, buttonText: { color: "#111", fontFamily: "Outfit-Bold", fontSize: 14 }, iconButton: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.14)" } });
