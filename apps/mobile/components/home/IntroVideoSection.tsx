import React, { useEffect, useState } from "react";
import { StyleSheet, View, useWindowDimensions } from "react-native";
import { Image } from "expo-image";
import { useContentWidth } from "@/lib/contentWidth";
import { useAdminPastel } from "@/components/admin/AdminUI";
import { Text } from "@/components/ScaledText";
import { SkeletonBox } from "@/components/ui/legacy-skeleton";
import { useActiveTab } from "@/context/ActiveTabContext";
import {
  getIntroStageSize,
  classifyIntroVideoSource,
  resolveIntroPoster,
  youtubePosterUrl,
  type IntroVideoRule,
} from "@/lib/home/introVideo";
import { HomeIntroPlayer } from "./video/HomeIntroPlayer";

type IntroVideoSectionProps = {
  video?: IntroVideoRule | null;
  heroPosterUrl?: string | null;
  loading?: boolean;
};

export const IntroVideoSection = React.memo(function IntroVideoSection({
  video,
  heroPosterUrl,
  loading,
}: IntroVideoSectionProps) {
  const p = useAdminPastel();
  const width = useContentWidth();
  const { height: windowHeight } = useWindowDimensions();
  const { activeTabIndex, currentTabIndex } = useActiveTab();
  const isTabActive = activeTabIndex === currentTabIndex;
  const [providerPoster, setProviderPoster] = useState<string | null>(null);
  const [providerAspectRatio, setProviderAspectRatio] = useState<number | null>(null);
  const posterUrl = video
    ? resolveIntroPoster(video, providerPoster, heroPosterUrl)
    : null;

  useEffect(() => {
    setProviderAspectRatio(null);
    if (!video) {
      setProviderPoster(null);
      return;
    }
    const kind = classifyIntroVideoSource(video.url);
    if (kind === "youtube") {
      setProviderPoster(youtubePosterUrl(video.url));
      setProviderAspectRatio(16 / 9);
      return;
    }
    if (kind !== "loom") {
      setProviderPoster(null);
      return;
    }

    let cancelled = false;
    setProviderPoster(null);
    void fetch(`https://www.loom.com/v1/oembed?url=${encodeURIComponent(video.url)}`)
      .then((response) => response.ok ? response.json() : null)
      .then((data) => {
        if (cancelled || !data) return;
        if (typeof data.thumbnail_url === "string") setProviderPoster(data.thumbnail_url);
        if (Number(data.width) > 0 && Number(data.height) > 0) {
          setProviderAspectRatio(Number(data.width) / Number(data.height));
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [video]);

  useEffect(() => {
    if (posterUrl) void Image.prefetch(posterUrl, "memory-disk");
  }, [posterUrl]);

  if (!video && !loading) return null;

  const cardWidth = width - 40;
  const initialHeight = getIntroStageSize(cardWidth, windowHeight, 16 / 9).height;

  return (
    <View style={styles.section}>
      <View style={styles.heading}>
        <Text style={[styles.eyebrow, { color: p.accent }]}>START HERE</Text>
        <Text style={[styles.title, { color: p.textPrimary }]}>{video?.title || "Welcome video"}</Text>
        {video?.description ? (
          <Text style={[styles.description, { color: p.textSecondary }]}>{video.description}</Text>
        ) : null}
      </View>

      {loading ? (
        <SkeletonBox width={cardWidth} height={initialHeight} borderRadius={20} />
      ) : isTabActive && video ? (
        <HomeIntroPlayer
          url={video.url}
          posterUrl={posterUrl}
          accentColor={p.accent}
          initialAspectRatio={providerAspectRatio}
        />
      ) : (
        <View style={[styles.inactiveStage, { width: cardWidth, height: initialHeight }]}>
          {posterUrl ? (
            <Image source={{ uri: posterUrl }} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory-disk" />
          ) : null}
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  section: { gap: 12 },
  heading: { gap: 4, paddingHorizontal: 2 },
  eyebrow: { fontFamily: "Outfit-Bold", fontSize: 11, letterSpacing: 1.4 },
  title: { fontFamily: "Outfit-Bold", fontSize: 22, lineHeight: 27, letterSpacing: -0.35 },
  description: { fontFamily: "Outfit-Regular", fontSize: 14, lineHeight: 20, maxWidth: 360 },
  inactiveStage: { overflow: "hidden", borderRadius: 20, backgroundColor: "#111" },
});
