import React from "react";
import { AppState, Image, Pressable, View } from "react-native";
import { Feather } from "@/components/ui/theme-icons";

import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { useActiveTabIndex } from "@/context/ActiveTabContext";
import { Text } from "@/components/ScaledText";
import { VideoPlayer, isYoutubeUrl, YouTubeEmbed } from "@/components/media/VideoPlayer";
import { Shadows, radius, spacing } from "@/constants/theme";

type IntroVideoSectionProps = {
  introVideoUrl?: string | null;
  posterUrl?: string | null;
  isTabActive?: boolean;
  tabIndex?: number;
};

export function IntroVideoSection({
  introVideoUrl,
  posterUrl,
  tabIndex = 0,
}: IntroVideoSectionProps) {
  const { isDark } = useAppTheme();
  const globalActiveTab = useActiveTabIndex();
  const [appActive, setAppActive] = React.useState(AppState.currentState === "active");
  const [hasUserStarted, setHasUserStarted] = React.useState(false);
  const [aspectRatio, setAspectRatio] = React.useState(16 / 10);

  const isTabActive = globalActiveTab === tabIndex;
  const shouldPlay = appActive && isTabActive && hasUserStarted;

  React.useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      setAppActive(state === "active");
    });
    return () => sub.remove();
  }, []);

  React.useEffect(() => {
    if (!posterUrl) return;
    Image.getSize(
      posterUrl,
      (width, height) => {
        if (width && height) setAspectRatio(Math.max(width / height, 0.8));
      },
      () => {},
    );
  }, [posterUrl]);

  if (!introVideoUrl) return null;

  return (
    <View style={{ gap: spacing.md }}>
      <View style={{ paddingHorizontal: 2 }}>
        <Text style={{ color: isDark ? "#fff" : "#0F172A", fontSize: 20, fontWeight: "700" }}>
          Intro video
        </Text>
      </View>

      <View
        className="overflow-hidden border"
        style={{
          backgroundColor: "#000",
          width: "100%",
          aspectRatio,
          borderRadius: radius.xxl,
          borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)",
          ...(isDark ? Shadows.none : Shadows.md),
        }}
      >
        {hasUserStarted ? (
          isYoutubeUrl(introVideoUrl) ? (
            <View style={{ flex: 1 }}>
              <YouTubeEmbed url={introVideoUrl} shouldPlay={shouldPlay} initialMuted={false} />
            </View>
          ) : (
            <VideoPlayer
              uri={introVideoUrl}
              posterUri={posterUrl ?? null}
              autoPlay
              shouldPlay={shouldPlay}
              initialMuted={false}
              ignoreTabFocus
              useVideoResolution={false}
              contentFitOverride="cover"
              immersive
            />
          )
        ) : (
          <Pressable onPress={() => setHasUserStarted(true)} style={{ flex: 1 }}>
            {posterUrl ? (
              <Image
                source={{ uri: posterUrl }}
                style={{ width: "100%", height: "100%" }}
                resizeMode="cover"
              />
            ) : (
              <View style={{ flex: 1, backgroundColor: "#0B0E12" }} />
            )}

            <View
              style={{
                position: "absolute",
                inset: 0,
                backgroundColor: "rgba(0,0,0,0.28)",
                justifyContent: "space-between",
                padding: spacing.lg,
              }}
            >
              <View
                style={{
                  alignSelf: "flex-start",
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderRadius: radius.pill,
                  backgroundColor: "rgba(0,0,0,0.46)",
                }}
              >
                <Text style={{ color: "#fff", fontSize: 11, fontWeight: "700" }}>Featured</Text>
              </View>

              <View style={{ alignItems: "center", justifyContent: "center" }}>
                <View
                  style={{
                    width: 68,
                    height: 68,
                    borderRadius: 34,
                    backgroundColor: "rgba(255,255,255,0.92)",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Feather name="play" size={22} color="#000" style={{ marginLeft: 3 }} />
                </View>
              </View>

              <View>
                <Text style={{ color: "#fff", fontSize: 19, fontWeight: "700" }}>Watch intro</Text>
              </View>
            </View>
          </Pressable>
        )}
      </View>
    </View>
  );
}
