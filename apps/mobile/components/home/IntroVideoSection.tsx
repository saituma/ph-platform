import React from "react";
import { AppState, Image, Linking, Pressable, TouchableOpacity, View } from "react-native";
import { Feather } from "@/components/ui/theme-icons";

import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { useActiveTabIndex } from "@/context/ActiveTabContext";
import { Text } from "@/components/ScaledText";
import { VideoPlayer, isYoutubeUrl } from "@/components/media/VideoPlayer";
import { Shadows } from "@/constants/theme";

type IntroVideoSectionProps = {
  introVideoUrl?: string | null;
  posterUrl?: string | null;
  isTabActive?: boolean;
  tabIndex?: number;
};

export function IntroVideoSection({
  introVideoUrl,
  posterUrl,
  tabIndex = 2,
}: IntroVideoSectionProps) {
  const { colors, isDark } = useAppTheme();
  const globalActiveTab = useActiveTabIndex();
  const [appActive, setAppActive] = React.useState(AppState.currentState === "active");
  const [hasUserStarted, setHasUserStarted] = React.useState(false);
  const [aspectRatio, setAspectRatio] = React.useState(16 / 10);

  const isTabActive = globalActiveTab === tabIndex;
  const shouldPlay = appActive && isTabActive && hasUserStarted;
  const isUnsupportedSource = isYoutubeUrl(introVideoUrl ?? undefined);

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
    <View
      className="overflow-hidden rounded-[32px] border"
      style={{
        backgroundColor: "#000",
        width: "100%",
        aspectRatio,
        borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(15,23,42,0.06)",
        ...(isDark ? Shadows.none : Shadows.lg),
      }}
    >
      {hasUserStarted ? (
        isUnsupportedSource ? (
          <UnsupportedIntroVideo posterUrl={posterUrl} accentColor={colors.accent} introVideoUrl={introVideoUrl} />
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
        <Pressable
          onPress={() => setHasUserStarted(true)}
          style={{ flex: 1 }}
        >
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
              backgroundColor: "rgba(0,0,0,0.35)",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <View
              className="h-20 w-20 rounded-full items-center justify-center border-2"
              style={{
                backgroundColor: "rgba(255,255,255,0.15)",
                borderColor: "rgba(255,255,255,0.3)",
              }}
            >
              <View className="h-14 w-14 rounded-full bg-white items-center justify-center shadow-2xl">
                <Feather name="play" size={24} color="#000" style={{ marginLeft: 4 }} />
              </View>
            </View>
            
            <View className="mt-6 items-center">
              <Text className="text-white font-clash text-xl font-bold">Watch Introduction</Text>
              <Text className="text-white/70 font-outfit text-sm mt-1">Start your journey here</Text>
            </View>
          </View>

          <View
            className="absolute top-5 left-5 rounded-full px-3 py-1.5"
            style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
          >
            <View className="flex-row items-center gap-2">
              <View className="h-1.5 w-1.5 rounded-full bg-accent" />
              <Text className="text-[10px] font-outfit font-bold text-white uppercase tracking-widest">
                Featured
              </Text>
            </View>
          </View>
        </Pressable>
      )}
    </View>
  );
}

function UnsupportedIntroVideo({
  posterUrl,
  accentColor,
  introVideoUrl,
}: {
  posterUrl?: string | null;
  accentColor: string;
  introVideoUrl?: string | null;
}) {
  return (
    <View style={{ flex: 1 }}>
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
          backgroundColor: "rgba(0,0,0,0.65)",
          justifyContent: "center",
          alignItems: "center",
          paddingHorizontal: 32,
        }}
      >
        <View
          className="h-16 w-16 rounded-3xl items-center justify-center border"
          style={{
            backgroundColor: "rgba(255,255,255,0.1)",
            borderColor: "rgba(255,255,255,0.2)",
          }}
        >
          <Feather name="external-link" size={24} color="#FFFFFF" />
        </View>
        <Text className="text-white font-clash text-xl font-bold mt-6 text-center">
          Open in Browser
        </Text>
        <Text className="text-white/70 font-outfit text-sm mt-2 text-center leading-5">
          This video source is optimized for web viewing. Tap to open the full experience.
        </Text>
        
        <TouchableOpacity 
          className="mt-8 rounded-full bg-white px-8 py-3"
          activeOpacity={0.8}
          onPress={() => {
            if (introVideoUrl) Linking.openURL(introVideoUrl).catch(() => {});
          }}
        >
          <Text className="text-black font-outfit font-bold text-sm uppercase tracking-wider">Open Video</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
