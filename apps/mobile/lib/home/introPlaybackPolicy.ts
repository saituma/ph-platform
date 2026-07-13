export const INTRO_RETRY_DELAYS_MS = [1200, 2500, 5000] as const;

export function retryDelayForAttempt(attempt: number): number | null {
  return INTRO_RETRY_DELAYS_MS[attempt] ?? null;
}

export function clampIntroSeek(seconds: number, duration: number): number {
  if (!Number.isFinite(seconds) || duration <= 0) return 0;
  return Math.max(0, Math.min(duration, seconds));
}

export function isIntroEnded(position: number, duration: number): boolean {
  return duration > 0 && position >= duration - 0.5;
}

export function shouldShowIntroControls(input: {
  requestedVisible: boolean;
  isPlaying: boolean;
  isLoading: boolean;
}): boolean {
  return input.requestedVisible || !input.isPlaying || input.isLoading;
}
