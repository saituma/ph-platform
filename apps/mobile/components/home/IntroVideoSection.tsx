import React, { useCallback, useEffect, useRef, useState } from "react";
import { AppState, Image, Pressable, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useVideoPlayer, VideoView } from "expo-video";
import { Feather } from "@expo/vector-icons";
import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { useActiveTabIndex } from "@/context/ActiveTabContext";
import { Text } from "@/components/ScaledText";

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
  
  const [appActive, setAppActive] = useState(true);
  const [showPlayer, setShowPlayer] = useState(false);
  const [aspectRatio, setAspectRatio] = useState(16 / 9);

  const isTabActive = globalActiveTab === tabIndex;

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      setAppActive(state === "active");
    });
    return () => sub.remove();
  }, []);

  // Hide player immediately if the tab becomes inactive
  useEffect(() => {
    if (!isTabActive) {
      setShowPlayer(false);
    }
  }, [isTabActive]);

  const shouldShowPlayer = showPlayer && appActive && isTabActive;

  console.warn(`[VideoRender] currentGlobalTab:${globalActiveTab} myHardcodedTab:${tabIndex} isActive:${isTabActive}`);
  useEffect(() => {
    if (posterUrl) {
      Image.getSize(
        posterUrl,
        (width, height) => {
          if (width && height) setAspectRatio(width / height);
        },
        () => {}, // ignore errors, fallback to 16/9
      );
    }
  }, [posterUrl]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (next) => {
      setAppActive(next === "active");
    });
    return () => sub.remove();
  }, []);



  if (!introVideoUrl) return null;

  // Poster state — shown before user taps play, when backgrounded, or when tab is not active.
  // When tab becomes inactive, we UNMOUNT the native player entirely to guarantee zero audio leak.
  if (!shouldShowPlayer) {
    return (
      <Pressable
        onPress={() => setShowPlayer(true)}
        className="overflow-hidden rounded-[28px]"
        style={{
          backgroundColor: isDark ? "#0a1a10" : "#111",
          aspectRatio,
        }}
      >
        {posterUrl ? (
          <Image
            source={{ uri: posterUrl }}
            className="absolute inset-0 w-full h-full"
            resizeMode="cover"
          />
        ) : null}

        <View
          className="absolute inset-0"
          style={{ backgroundColor: "rgba(0,0,0,0.35)" }}
        />

        <View className="absolute inset-0 items-center justify-center">
          <View
            className="h-20 w-20 items-center justify-center rounded-full"
            style={{
              backgroundColor: "rgba(255,255,255,0.15)",
              borderWidth: 1.5,
              borderColor: "rgba(255,255,255,0.3)",
            }}
          >
            <Feather
              name="play"
              size={34}
              color="#fff"
              style={{ marginLeft: 4 }}
            />
          </View>
        </View>

        <View
          className="absolute bottom-4 left-4 right-4 rounded-2xl px-4 py-3"
          style={{
            backgroundColor: isDark ? "rgba(6,16,10,0.7)" : "rgba(0,0,0,0.55)",
          }}
        >
          <Text className="text-sm font-outfit font-semibold text-white">
            Tap to watch the intro
          </Text>
        </View>
      </Pressable>
    );
  }

  return <ActiveVideoPlayer videoUrl={introVideoUrl} posterUrl={posterUrl} appActive={appActive} isTabActive={isTabActive} />;
}

/* ------------------------------------------------------------------ */
/* Wrapper component to guarantee safe unload on unmount              */
/* ------------------------------------------------------------------ */

function ActiveVideoPlayer({ 
  videoUrl, 
  posterUrl,
  appActive,
  isTabActive
}: { 
  videoUrl: string; 
  posterUrl?: string | null;
  appActive: boolean;
  isTabActive: boolean;
}) {
  // Use the poster aspect ratio initially to avoid flashes if it's there
  const [aspectRatio, setAspectRatio] = useState(16 / 9);

  const player = useVideoPlayer(videoUrl, (player) => {
    player.loop = false;
    // Attempt standard OS level constraint
    player.staysActiveInBackground = false;
  });

  // Track app foreground/background directly within the player to guarantee a synchronous pause
  useEffect(() => {
    const sub = AppState.addEventListener("change", (next) => {
      // The moment the OS signals a background state, aggressively pause the actual native player
      // synchronously before the JS thread gets entirely suspended by the OS.
      if (next !== "active") {
        try {
          player.pause();
        } catch {}
      }
    });
    return () => sub.remove();
  }, [player]);

  // We rely on the poster's Image.getSize aspect ratio and contentFit="contain"
  // to ensure the video perfectly fits its container without cropping.

  // Explicit simple IF statement: if on Home tab -> play, otherwise -> pause.
  useEffect(() => {
    if (appActive && isTabActive) {
      if (__DEV__) console.debug('[IntroVideo] PLAYING — appActive:', appActive, 'tabActive:', isTabActive);
      player.play();
    } else {
      if (__DEV__) console.debug('[IntroVideo] PAUSING — appActive:', appActive, 'tabActive:', isTabActive);
      player.pause();
    }
  }, [appActive, player, isTabActive]);

  // When this component is unmounted (e.g. switched to poster),
  // aggressively pause and attempt a hard release to prevent zombie audio
  useEffect(() => {
    return () => {
      try {
        player.pause();
        // Force the native node to release its resources entirely if possible
        (player as any)?.release?.();
      } catch {}
    };
  }, [player]);

  return (
    <View
      className="overflow-hidden rounded-[28px]"
      style={{
        backgroundColor: "#000",
      }}
    >
      <VideoView
        player={player}
        nativeControls={true}
        contentFit="contain"
        style={{ width: "100%", aspectRatio }}
      />
    </View>
  );
}
