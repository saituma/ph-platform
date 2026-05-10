import {
	isAthleteUserRole,
	isCoachLikeRole,
	isGuardianRole,
	isTeamFacingCoachRole,
} from "@ph/roles";

export function isPortalCoachLikeRole(role: string | undefined): boolean {
	return isCoachLikeRole(role);
}

export function isPortalTeamFacingCoachRole(role: string | undefined): boolean {
	return isTeamFacingCoachRole(role);
}

export function isPortalAthleteRole(role: string | undefined): boolean {
	return isAthleteUserRole(role);
}

/** Athletes (and guardians) use the portal daily nutrition log. */
export function isPortalAthleteFamilyRole(role: string | undefined): boolean {
	return isGuardianRole(role) || isAthleteUserRole(role);
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

export function showPortalPhysioReferralNav(role: string | undefined): boolean {
	return isPortalAthleteFamilyRole(role);
}

export function isPortalTeamRosterManagerRole(
	role: string | undefined,
): boolean {
	if (role == null) return false;
	if (role === "admin" || role === "superAdmin") return true;
	return isPortalTeamFacingCoachRole(role);
}
