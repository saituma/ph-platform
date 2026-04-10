import React from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { Text } from "@/components/ScaledText";

const absoluteFillObject = StyleSheet.absoluteFillObject;

interface VideoControlsProps {
  isPlaying: boolean;
  isMuted: boolean;
  position: number;
  duration: number;
  progress: number;
  accentColor: string;
  hideCenterControls?: boolean;
  hideControls?: boolean;
  togglePlay: () => void;
  toggleMute: () => void;
  openFullscreen: () => void;
}

export function VideoControls({
  isPlaying,
  isMuted,
  position,
  duration,
  progress,
  accentColor,
  hideCenterControls,
  hideControls,
  togglePlay,
  toggleMute,
  openFullscreen,
}: VideoControlsProps) {
  const formatTime = (s: number) =>
    `${Math.floor(s / 60)}:${Math.floor(s % 60)
      .toString()
      .padStart(2, "0")}`;

  return (
    <>
      {!hideCenterControls && (
        <Pressable
          onPress={togglePlay}
          style={[
            absoluteFillObject,
            { justifyContent: "center", alignItems: "center", zIndex: 10 },
          ]}
        >
          <View
            style={{
              backgroundColor: "rgba(0,0,0,0.5)",
              borderRadius: 50,
              padding: 20,
            }}
          >
            <Feather
              name={isPlaying ? "pause" : "play"}
              size={40}
              color="white"
            />
          </View>
        </Pressable>
      )}

      {!hideControls && (
        <View
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            padding: 16,
            backgroundColor: "rgba(0,0,0,0.6)",
            zIndex: 15,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 8,
            }}
          >
            <Text style={{ color: "white", fontSize: 12 }}>
              {formatTime(position)}
            </Text>
            <Text style={{ color: "white", fontSize: 12 }}>
              {formatTime(duration)}
            </Text>
          </View>
          <View
            style={{
              height: 4,
              backgroundColor: "rgba(255,255,255,0.3)",
              borderRadius: 2,
              overflow: "hidden",
            }}
          >
            <View
              style={{
                height: "100%",
                width: `${progress * 100}%`,
                backgroundColor: accentColor,
              }}
            />
          </View>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              marginTop: 12,
            }}
          >
            <Pressable onPress={toggleMute}>
              <Feather
                name={isMuted ? "volume-x" : "volume-2"}
                size={24}
                color="white"
              />
            </Pressable>
            <Pressable onPress={togglePlay}>
              <Feather
                name={isPlaying ? "pause" : "play"}
                size={28}
                color="white"
              />
            </Pressable>
            <Pressable onPress={openFullscreen}>
              <Feather name="maximize" size={24} color="white" />
            </Pressable>
          </View>
        </View>
      )}
    </>
  );
}
