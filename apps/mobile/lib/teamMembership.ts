export function hasAssignedTeam(team: string | null | undefined) {
  const normalized = String(team ?? "").trim().toLowerCase();
  if (!normalized) return false;
  return normalized !== "unknown";
}

