import { isPlatformAdmin, isTrainingStaff } from "./user-roles";
import { getManagedTeamIds } from "../services/team-membership";

/**
 * Single source of truth for who may see the SHARED ("admin oversight") message inbox
 * and join the `admin:all` realtime room — i.e. platform staff who oversee everyone's DMs.
 *
 * Membership-based on purpose: a TEAM MANAGER (owns or co-manages a team) is always scoped
 * to their own conversations, regardless of their exact role string. This kills the whole
 * class of leaks where a manager mis-labelled as `coach`/`team_coach` would otherwise join
 * the global broadcast and the shared inbox.
 *
 *   - admin / superAdmin        → always a shared-inbox viewer (true platform oversight)
 *   - coach / program_coach     → shared-inbox viewer ONLY if they manage no team
 *   - team manager (any role)   → never (scoped to their own DMs)
 *   - athletes / guardians / …  → never
 */
export async function isSharedInboxViewer(userId: number, role: string | null | undefined): Promise<boolean> {
  const r = role ?? "";
  if (isPlatformAdmin(r)) return true;
  if (!isTrainingStaff(r)) return false;
  const managedTeamIds = await getManagedTeamIds(userId);
  return managedTeamIds.length === 0;
}
