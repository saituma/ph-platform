export function hasAssignedTeam(team: string | null | undefined) {
  const normalized = String(team ?? "").trim().toLowerCase();
  if (!normalized) return false;
  return normalized !== "unknown";
}

/** True if the athlete row is linked to an org team (roster) even when `team` text is empty. */
export function hasOrgTeamMembership(athlete?: {
  team?: string | null;
  teamId?: number | null;
} | null): boolean {
  if (hasAssignedTeam(athlete?.team)) return true;
  const id = athlete?.teamId;
  return typeof id === "number" && Number.isFinite(id) && id > 0;
}

