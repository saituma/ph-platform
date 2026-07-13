import {
  clampIntroSeek,
  isIntroEnded,
  retryDelayForAttempt,
  shouldShowIntroControls,
} from "@/lib/home/introPlaybackPolicy";
import {
  clearIntroProgress,
  readIntroProgress,
  writeIntroProgress,
} from "@/components/home/video/sessionProgress";

describe("home intro playback policy", () => {
  it("bounds retries and clamps scrubbing to the playable range", () => {
    expect([0, 1, 2, 3].map(retryDelayForAttempt)).toEqual([1200, 2500, 5000, null]);
    expect(clampIntroSeek(-10, 60)).toBe(0);
    expect(clampIntroSeek(35, 60)).toBe(35);
    expect(clampIntroSeek(90, 60)).toBe(60);
  });

  it("shows controls while paused or loading and recognizes replay state", () => {
    expect(shouldShowIntroControls({ requestedVisible: false, isPlaying: true, isLoading: false })).toBe(false);
    expect(shouldShowIntroControls({ requestedVisible: false, isPlaying: false, isLoading: false })).toBe(true);
    expect(shouldShowIntroControls({ requestedVisible: false, isPlaying: true, isLoading: true })).toBe(true);
    expect(isIntroEnded(59.6, 60)).toBe(true);
  });

  it("keeps progress for this app session and clears it for replay", () => {
    writeIntroProgress("intro.mp4", 18.5);
    expect(readIntroProgress("intro.mp4")).toBe(18.5);
    clearIntroProgress("intro.mp4");
    expect(readIntroProgress("intro.mp4")).toBe(0);
  });
});
