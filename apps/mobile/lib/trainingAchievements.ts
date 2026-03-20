/** Labels for achievement keys returned by POST /program-section-content/complete-session */
export const ACHIEVEMENT_TITLES: Record<string, string> = {
  first_rep: "First rep",
  full_session: "Full session",
  reps_10: "10 check-ins",
  reps_50: "50 check-ins",
  days_5: "5-day habit",
  days_12: "12-day commitment",
  sessions_10: "10 sessions",
};

export function formatAchievementNames(keys: string[]): string {
  return keys.map((k) => ACHIEVEMENT_TITLES[k] ?? k).join(" · ");
}
