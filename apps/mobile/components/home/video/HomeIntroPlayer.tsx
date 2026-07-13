import React, { useEffect, useMemo, useState } from "react";
import { StyleSheet, View, useWindowDimensions } from "react-native";
import { classifyIntroVideoSource, getIntroStageSize } from "@/lib/home/introVideo";
import { DirectIntroPlayer } from "./DirectIntroPlayer";
import { EmbeddedIntroPlayer } from "./EmbeddedIntroPlayer";

export const HomeIntroPlayer = React.memo(function HomeIntroPlayer({ url, posterUrl, accentColor, initialAspectRatio }: { url: string; posterUrl: string | null; accentColor: string; initialAspectRatio?: number | null }) {
  const { height: windowHeight } = useWindowDimensions();
  const [width, setWidth] = useState(0);
  const [aspectRatio, setAspectRatio] = useState(initialAspectRatio ?? 16 / 9);
  const kind = useMemo(() => classifyIntroVideoSource(url), [url]);
  const stage = getIntroStageSize(width, windowHeight, aspectRatio);
  useEffect(() => setAspectRatio(initialAspectRatio ?? 16 / 9), [initialAspectRatio, url]);
  return <View onLayout={(event) => setWidth(event.nativeEvent.layout.width)} style={[styles.stage, { height: width > 0 ? stage.height : undefined, aspectRatio: width > 0 ? undefined : 16 / 9 }]}>
    {kind === "direct" ? <DirectIntroPlayer url={url} posterUrl={posterUrl} accentColor={accentColor} onAspectRatio={setAspectRatio} /> : <EmbeddedIntroPlayer kind={kind} url={url} posterUrl={posterUrl} width={stage.width} height={stage.height} />}
  </View>;
});
const styles = StyleSheet.create({ stage: { width: "100%", overflow: "hidden", borderRadius: 20, backgroundColor: "#000", borderWidth: StyleSheet.hairlineWidth, borderColor: "rgba(255,255,255,0.14)" } });
