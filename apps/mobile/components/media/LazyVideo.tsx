/**
 * LazyVideo — drop-in replacement for `<VideoPlayer>` when the player will be
 * rendered in a list/scroll context. Renders a poster-only `<VideoThumb>`
 * (zero native decoder) until the user taps it, then swaps in the real
 * `<VideoPlayer>` for that one card.
 *
 * Use this on every screen where multiple video tiles could appear at once
 * (assigned-session exercise cards, SessionExerciseBlock items, coach review
 * lists, athlete-upload lists). Single-video detail screens should keep using
 * `<VideoPlayer>` directly — the lazy step only helps when many would mount.
 *
 * Once expanded, the player stays mounted for the lifetime of the component.
 */
import React, { useState } from "react";
import { View } from "react-native";
import { VideoPlayer } from "./VideoPlayer";
import { VideoThumb } from "./VideoThumb";

type VideoPlayerProps = React.ComponentProps<typeof VideoPlayer>;

interface LazyVideoProps extends VideoPlayerProps {
  /** Height of the placeholder thumb. Passed through to VideoPlayer once
   * expanded too. */
  height?: number;
  /** Optional duration label rendered on the thumb (e.g. "1:24"). */
  durationSec?: number | null;
  /** Optional rounded radius for the thumb. Caller usually wraps in their
   * own rounded container, so default 0. */
  thumbBorderRadius?: number;
  /** Display label for the play button's a11y action. */
  thumbLabel?: string;
}

export function LazyVideo({
  height,
  durationSec,
  thumbBorderRadius,
  thumbLabel,
  ...playerProps
}: LazyVideoProps) {
  const [expanded, setExpanded] = useState(false);
  if (!expanded) {
    return (
      <VideoThumb
        posterUri={playerProps.posterUri ?? null}
        height={height}
        durationSec={durationSec ?? null}
        label={thumbLabel ?? playerProps.title ?? "Play video"}
        borderRadius={thumbBorderRadius ?? 0}
        onPress={() => setExpanded(true)}
      />
    );
  }
  // The user tapped to expand — that IS the intent to play. Pass
  // ignoreTabFocus so the engine's effectiveShouldPlay check doesn't gate on
  // tab/nav state (which resolves false on non-tab routes like
  // /programs/session/[sessionId], and would otherwise leave the player at
  // 0:00 with .play() never called).
  return (
    <View>
      <VideoPlayer {...playerProps} height={height} autoPlay shouldPlay ignoreTabFocus />
    </View>
  );
}
