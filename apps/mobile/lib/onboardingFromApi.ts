type OnboardingAthleteRow = {
  onboardingCompleted?: boolean | null;
  userId?: number | null;
} | null;

export function reduxStateFromOnboardingAthlete(
  athlete: OnboardingAthleteRow | undefined,
): { onboardingCompleted: boolean | null; athleteUserId: number | null } {
  if (athlete == null) {
    return { onboardingCompleted: null, athleteUserId: null };
  }
  const uid = athlete.userId;
  return {
    onboardingCompleted:
      typeof athlete.onboardingCompleted === "boolean" ? athlete.onboardingCompleted : null,
    athleteUserId: typeof uid === "number" && Number.isFinite(uid) ? uid : null,
  };
}

export function shouldOpenTabsAfterAuth(
  state: { onboardingCompleted?: boolean | null } | null | undefined,
): boolean {
  return state?.onboardingCompleted === true;
}
