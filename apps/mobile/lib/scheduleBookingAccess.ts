/** Team roster accounts cannot self-book; coach/admin adds sessions. */
export function canSelfBookSchedule(apiUserRole: string | null | undefined): boolean {
  const r = String(apiUserRole ?? "").toLowerCase();
  return r !== "team_athlete";
}
