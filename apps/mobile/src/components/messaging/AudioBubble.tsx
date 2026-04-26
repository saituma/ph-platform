import React, { useEffect, useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";

import { tokens } from "@/src/theme/tokens";

const TAIL_SIZE = tokens.spacing.sm - tokens.spacing.xs / 2;
const PLAY_ICON_SIZE = tokens.fontSize.large;
const WAVE_BAR_WIDTH = tokens.spacing.xs - tokens.spacing.xs / 4;
const WAVE_BAR_GAP = tokens.spacing.xs - tokens.spacing.xs / 2;
const WAVE_ALPHA = 0.6;
const STATUS_UPDATE_INTERVAL = tokens.timing.fast;

const WAVE_HEIGTHS = [12, 20, 16, 24, 18, 22, 14, 20] as const;

export interface AudioBubbleProps {
  uri: string;
  duration: number;
  isOwn: boolean;
  hideTail?: boolean;
}

const hexToRgba = (hexColor: string, alpha: number): string => {
  const hex = hexColor.replace("#", "");
  const normalized =
    hex.length === 3
      ? hex
          .split("")
          .map((char) => `${char}${char}`)
          .join("")
      : hex;
  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const formatDuration = (seconds: number): string => {
  const safe = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safe / 60);
  const remainder = safe % 60;
  return `${minutes}:${String(remainder).padStart(2, "0")}`;
};

const ownWaveColor = hexToRgba(tokens.colors.bubbleSentText, WAVE_ALPHA);
const otherWaveColor = hexToRgba(tokens.colors.bubbleReceivedText, WAVE_ALPHA);

export const AudioBubble = ({ uri, duration, isOwn, hideTail = false }: AudioBubbleProps) => {
  const source = useMemo(() => ({ uri }), [uri]);
  const player = useAudioPlayer(source, { updateInterval: STATUS_UPDATE_INTERVAL });
  const status = useAudioPlayerStatus(player);
  const playing = Boolean(status.playing);
  const elapsed = Math.max(0, Math.floor(status.currentTime ?? 0));

  useEffect(() => {
    return () => {
      try {
        player.pause();
      } catch {
        // no-op
      }
      void player.seekTo(0);
    };
  }, [player]);

  return (
    <View style={[styles.container, isOwn ? styles.ownContainer : styles.otherContainer]}>
      <View style={[styles.bubble, isOwn ? styles.ownBubble : styles.otherBubble]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={playing ? "Pause audio message" : "Play audio message"}
          onPress={() => {
            if (playing) {
              player.pause();
            } else {
              player.play();
            }
          }}
          style={styles.playButton}
        >
          <Ionicons
            name={playing ? "pause" : "play"}
            size={PLAY_ICON_SIZE}
            color={isOwn ? tokens.colors.bubbleSentText : tokens.colors.bubbleReceivedText}
          />
        </Pressable>

        <View style={styles.waveWrap}>
          {WAVE_HEIGTHS.map((barHeight, index) => (
            <View
              key={`wave-${index}`}
              style={[
                styles.waveBar,
                waveBarHeightByIndex[index],
                isOwn ? styles.ownWaveBar : styles.otherWaveBar,
              ]}
            />
          ))}
        </View>

        <Text
          allowFontScaling={true}
          style={[styles.timeText, isOwn ? styles.ownTimeText : styles.otherTimeText]}
        >
          {formatDuration(elapsed)} / {formatDuration(duration)}
        </Text>
      </View>

      {hideTail ? null : (
        <View
          style={[
            styles.tailBase,
            isOwn ? styles.ownTail : styles.otherTail,
            isOwn ? styles.ownTailPosition : styles.otherTailPosition,
          ]}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
    maxWidth: "75%",
    position: "relative",
  },
  ownContainer: {
    alignSelf: "flex-end",
  },
  otherContainer: {
    alignSelf: "flex-start",
  },
  bubble: {
    borderRadius: tokens.radii.bubble,
    paddingVertical: tokens.spacing.sm,
    paddingHorizontal: tokens.spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.sm,
  },
  ownBubble: {
    backgroundColor: tokens.colors.bubbleSent,
  },
  otherBubble: {
    backgroundColor: tokens.colors.bubbleReceived,
  },
  playButton: {
    width: tokens.spacing.xxl,
    height: tokens.spacing.xxl,
    borderRadius: tokens.radii.badge,
    alignItems: "center",
    justifyContent: "center",
  },
  waveWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: WAVE_BAR_GAP,
    flex: 1,
  },
  waveBar: {
    width: WAVE_BAR_WIDTH,
    borderRadius: tokens.radii.pill,
  },
  ownWaveBar: {
    backgroundColor: ownWaveColor,
  },
  otherWaveBar: {
    backgroundColor: otherWaveColor,
  },
  timeText: {
    fontSize: tokens.fontSize.sm,
    fontWeight: tokens.fontWeight.medium,
  },
  ownTimeText: {
    color: tokens.colors.bubbleSentText,
  },
  otherTimeText: {
    color: tokens.colors.bubbleReceivedText,
  },
  tailBase: {
    width: 0,
    height: 0,
    borderTopWidth: TAIL_SIZE,
    borderBottomWidth: 0,
    borderLeftWidth: TAIL_SIZE,
    borderRightWidth: TAIL_SIZE,
    borderTopColor: "transparent",
    borderBottomColor: "transparent",
    position: "absolute",
    bottom: 0,
  },
  ownTail: {
    borderLeftColor: "transparent",
    borderRightColor: tokens.colors.bubbleSent,
  },
  otherTail: {
    borderRightColor: "transparent",
    borderLeftColor: tokens.colors.bubbleReceived,
  },
  ownTailPosition: {
    right: tokens.spacing.xs,
  },
  otherTailPosition: {
    left: tokens.spacing.xs,
  },
});

const waveBarHeightStyles = StyleSheet.create({
  h0: { height: WAVE_HEIGTHS[0] },
  h1: { height: WAVE_HEIGTHS[1] },
  h2: { height: WAVE_HEIGTHS[2] },
  h3: { height: WAVE_HEIGTHS[3] },
  h4: { height: WAVE_HEIGTHS[4] },
  h5: { height: WAVE_HEIGTHS[5] },
  h6: { height: WAVE_HEIGTHS[6] },
  h7: { height: WAVE_HEIGTHS[7] },
});

const waveBarHeightByIndex = [
  waveBarHeightStyles.h0,
  waveBarHeightStyles.h1,
  waveBarHeightStyles.h2,
  waveBarHeightStyles.h3,
  waveBarHeightStyles.h4,
  waveBarHeightStyles.h5,
  waveBarHeightStyles.h6,
  waveBarHeightStyles.h7,
] as const;
