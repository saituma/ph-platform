const PORTAL_COACH_LIKE_ROLES = new Set([
	"coach",
	"team_coach",
	"program_coach",
]);

/** Roster / team coaches — not the program-level nutrition specialist role. */
const PORTAL_TEAM_FACING_COACH_ROLES = new Set(["coach", "team_coach"]);

const PORTAL_ATHLETE_ROLES = new Set([
	"athlete",
	"team_athlete",
	"adult_athlete",
	"youth_athlete",
]);

/** API may return legacy `coach` or post-migration `team_coach` / `program_coach`. */
export function isPortalCoachLikeRole(role: string | undefined): boolean {
	return role != null && PORTAL_COACH_LIKE_ROLES.has(role);
}

export function isPortalTeamFacingCoachRole(role: string | undefined): boolean {
	return role != null && PORTAL_TEAM_FACING_COACH_ROLES.has(role);
}

/** Athletes (and guardians) use the portal daily nutrition log. */
export function isPortalAthleteFamilyRole(role: string | undefined): boolean {
	if (role == null) return false;
	if (role === "guardian") return true;
	return PORTAL_ATHLETE_ROLES.has(role);
}

/**
 * Who should see Nutrition in the portal sidebar / routes.
 * Team-facing coaches manage athletes elsewhere; athletes and program-level staff keep access.
 */
export function showPortalNutritionNav(role: string | undefined): boolean {
	if (role == null) return false;
	if (isPortalTeamFacingCoachRole(role)) return false;
	if (isPortalAthleteFamilyRole(role)) return true;
	if (role === "program_coach" || role === "admin" || role === "superAdmin")
		return true;
	return false;
}

/**
 * Physio referrals are assigned to athletes by admins/coaches.
 * Athletes see their assigned referral; coaches manage them via apps/web.
 */
export function showPortalPhysioReferralNav(role: string | undefined): boolean {
	if (role == null) return false;
	if (isPortalAthleteFamilyRole(role)) return true;
	return false;
}

/**
 * Team roster portal + `/api/team/roster*` (requireRole treats `team_coach` like legacy `coach`).
 */
export function isPortalTeamRosterManagerRole(
	role: string | undefined,
): boolean {
	if (role == null) return false;
	if (role === "admin" || role === "superAdmin") return true;
	if (role === "coach" || role === "team_coach") return true;
	return false;
}
