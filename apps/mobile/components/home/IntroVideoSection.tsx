import React from "react";
import { AppState, Image, Pressable, View } from "react-native";
import { Feather } from "@expo/vector-icons";

import { useAppTheme } from "@/app/theme/AppThemeProvider";
import { useActiveTabIndex } from "@/context/ActiveTabContext";
import { Text } from "@/components/ScaledText";
import { VideoPlayer, isYoutubeUrl } from "@/components/media/VideoPlayer";

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
  const { colors } = useAppTheme();
  const globalActiveTab = useActiveTabIndex();
  const [appActive, setAppActive] = React.useState(AppState.currentState === "active");
  const [hasUserStarted, setHasUserStarted] = React.useState(false);
  const [aspectRatio, setAspectRatio] = React.useState(16 / 9);

  const isTabActive = globalActiveTab === tabIndex;
  const shouldPlay = appActive && isTabActive && hasUserStarted;
  const isUnsupportedSource = isYoutubeUrl(introVideoUrl);

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
        if (width && height) setAspectRatio(width / height);
      },
      () => {},
    );
  }, [posterUrl]);

  if (!introVideoUrl) return null;

  return (
    <View
      className="overflow-hidden rounded-[28px]"
      style={{
        backgroundColor: "#000",
        width: "100%",
        aspectRatio,
      }}
    >
      {hasUserStarted ? (
        isUnsupportedSource ? (
          <UnsupportedIntroVideo posterUrl={posterUrl} accentColor={colors.accent} />
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
          onPress={() => {
            if (isUnsupportedSource) {
              setHasUserStarted(true);
              return;
            }
            setHasUserStarted(true);
          }}
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
              backgroundColor: "rgba(0,0,0,0.28)",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <View
              style={{
                width: 72,
                height: 72,
                borderRadius: 36,
                backgroundColor: "rgba(255,255,255,0.2)",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 14,
              }}
            >
              <Feather name="play" size={28} color="#FFFFFF" />
            </View>
            <Text
              className="font-outfit-semibold"
              style={{ color: "#FFFFFF", fontSize: 15 }}
            >
              Play Intro Video
            </Text>
            <Text
              className="font-outfit"
              style={{ color: "rgba(255,255,255,0.82)", fontSize: 12, marginTop: 4 }}
            >
              {isUnsupportedSource ? "Direct hosted video required" : "Ready to play"}
            </Text>
          </View>
          <View
            style={{
              position: "absolute",
              top: 14,
              right: 14,
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderRadius: 999,
              backgroundColor: "rgba(0,0,0,0.45)",
            }}
          >
            <Text
              className="font-outfit-semibold"
              style={{ color: colors.accent, fontSize: 11 }}
            >
              INTRO
            </Text>
          </View>
        </Pressable>
      )}
    </View>
  );
}

function UnsupportedIntroVideo({
  posterUrl,
  accentColor,
}: {
  posterUrl?: string | null;
  accentColor: string;
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
          backgroundColor: "rgba(0,0,0,0.52)",
          justifyContent: "center",
          alignItems: "center",
          paddingHorizontal: 24,
        }}
      >
        <View
          style={{
            width: 72,
            height: 72,
            borderRadius: 36,
            backgroundColor: "rgba(255,255,255,0.12)",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 14,
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.16)",
          }}
        >
          <Feather name="alert-circle" size={28} color="#FFFFFF" />
        </View>
        <Text
          className="font-outfit-semibold"
          style={{ color: "#FFFFFF", fontSize: 15, textAlign: "center" }}
        >
          Intro Video Source Unsupported
        </Text>
        <Text
          className="font-outfit"
          style={{ color: "rgba(255,255,255,0.82)", fontSize: 12, marginTop: 6, textAlign: "center" }}
        >
          Replace this intro video with an uploaded file or direct `.mp4` URL to play it inside the app.
        </Text>
        <View
          style={{
            marginTop: 14,
            paddingHorizontal: 12,
            paddingVertical: 7,
            borderRadius: 999,
            backgroundColor: "rgba(255,255,255,0.1)",
          }}
        >
          <Text
            className="font-outfit-semibold"
            style={{ color: accentColor, fontSize: 11 }}
          >
            HOSTED VIDEO ONLY
          </Text>
        </View>
      </View>
    </View>
  );
}
