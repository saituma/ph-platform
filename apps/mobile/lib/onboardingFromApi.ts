/** GET /onboarding returns `{ athlete }` — shape used across login, sync, and refresh. */
export type OnboardingApiAthlete = {
  onboardingCompleted?: boolean;
  userId?: number;
} | null;

/**
 * Maps GET /onboarding `athlete` to Redux. When `athlete` is null, returns `null` for
 * onboardingCompleted (unknown / ambiguous) — do not treat as "must show onboarding"
 * from tab layout, to avoid loops when the API briefly returns no row.
 */
export function reduxStateFromOnboardingAthlete(athlete: OnboardingApiAthlete | undefined): {
  onboardingCompleted: boolean | null;
  athleteUserId: number | null;
} {
  if (athlete == null) {
    return { onboardingCompleted: null, athleteUserId: null };
  }
  return {
    onboardingCompleted: Boolean(athlete.onboardingCompleted),
    athleteUserId: athlete.userId ?? null,
  };
}

/** After explicit login/verify, user should only skip onboarding when completion is confirmed. */
export function shouldOpenTabsAfterAuth(athlete: OnboardingApiAthlete | undefined): boolean {
  return athlete?.onboardingCompleted === true;
}
