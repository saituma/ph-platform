import React, { useCallback, useEffect, useRef, useState } from "react";
import { AppState, Image, Pressable, View } from "react-native";
import { useEventListener } from "expo";
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
  const [aspectRatio, setAspectRatio] = useState(16 / 9);

  const isTabActive = globalActiveTab === tabIndex;

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      setAppActive(state === "active");
    });
    return () => sub.remove();
  }, []);



  const shouldShowPlayer = appActive && isTabActive;

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





  if (!introVideoUrl) return null;

  return (
    <ActiveVideoPlayer 
      videoUrl={introVideoUrl} 
      posterUrl={posterUrl} 
      appActive={appActive} 
      isTabActive={isTabActive} 
      aspectRatio={aspectRatio}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Wrapper component to guarantee safe unload on unmount              */
/* ------------------------------------------------------------------ */

function ActiveVideoPlayer({ 
  videoUrl, 
  posterUrl,
  appActive,
  isTabActive,
  aspectRatio = 16 / 9,
}: { 
  videoUrl: string; 
  posterUrl?: string | null;
  appActive: boolean;
  isTabActive: boolean;
  aspectRatio?: number;
}) {
  const player = useVideoPlayer(videoUrl, (player) => {
    player.loop = false;
    // Attempt standard OS level constraint
    player.staysActiveInBackground = false;
  });

  const [actualRatio, setActualRatio] = useState(aspectRatio);
  // Track if the user has explicitly started viewing. 
  // This prevents the video from auto-playing on first landing but allows it to resume after switching tabs.
  const [userIntentToPlay, setUserIntentToPlay] = useState(false);

  useEventListener(player, 'videoTrackChange', (payload) => {
    if (payload.videoTrack?.size) {
      const { width, height } = payload.videoTrack.size;
      if (width && height) {
        setActualRatio(width / height);
      }
    }
  });

  useEventListener(player, 'playingChange', (payload) => {
    if (payload.isPlaying && !userIntentToPlay) {
      setUserIntentToPlay(true);
    }
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

  // Explicit simple IF statement: if on Home tab AND user wants to play -> play, otherwise -> pause.
  useEffect(() => {
    if (appActive && isTabActive && userIntentToPlay) {
      if (__DEV__) console.debug('[IntroVideo] PLAYING — appActive:', appActive, 'tabActive:', isTabActive, 'intent:', userIntentToPlay);
      player.play();
    } else {
      if (__DEV__) console.debug('[IntroVideo] PAUSING — appActive:', appActive, 'tabActive:', isTabActive, 'intent:', userIntentToPlay);
      player.pause();
    }
  }, [appActive, player, isTabActive, userIntentToPlay]);

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
        width: "100%",
        aspectRatio: actualRatio, // <-- Dynamically updates to exact video resolution
      }}
    >
      <VideoView
        player={player}
        nativeControls={true}
        contentFit="cover" // <-- Changed to cover so the video perfectly fills the calculated box
        style={{ width: "100%", height: "100%" }}
      />
    </View>
  );
}
