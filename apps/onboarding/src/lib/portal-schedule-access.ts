import type { PortalUser } from "@/portal/portal-types";

/** Team roster athletes use coach-managed scheduling; they only view confirmed bookings. */
export function portalUserMaySelfBookSchedule(user: PortalUser | null | undefined): boolean {
	if (!user?.role) return true;
	const r = String(user.role).toLowerCase();
	if (r === "team_athlete") return false;
	if (r === "athlete" && user.team?.id != null) return false;
	return true;
}
