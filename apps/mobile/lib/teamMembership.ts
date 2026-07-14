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

/**
 * True only when the athlete is linked to a real team row.
 *
 * `athletes.team` is free text and is set even when the name matches no team (admin resolves
 * teamId by name and silently stores null on a miss). Every team feed/social endpoint scopes by
 * `athletes.teamId` and rejects a missing one with NOT_TEAM, so anything that talks to those
 * endpoints must gate on this — not on the name, or the UI promises a feed that cannot exist.
 */
export function hasLinkedTeam(athlete?: { teamId?: number | null } | null): boolean {
  const id = athlete?.teamId;
  return typeof id === "number" && Number.isFinite(id) && id > 0;
}

