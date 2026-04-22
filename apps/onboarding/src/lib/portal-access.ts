import type { PortalUser } from "@/portal/portal-types";

/** Coach accounts (not admins) use team billing — they do not satisfy portal via individual `programTier`. */
function isCoachBillingRole(role: string | null | undefined): boolean {
	const r = String(role ?? "").toLowerCase();
	return r === "coach" || r === "team_coach" || r === "program_coach";
}

function isFutureExpiry(planExpiresAt: string | null | undefined): boolean {
	if (!planExpiresAt) return false;
	const t = new Date(planExpiresAt).getTime();
	if (Number.isNaN(t)) return false;
	return t > Date.now();
}

function teamPortalSubscriptionActive(
	t:
		| {
				id?: number;
				planId?: number | null;
				subscriptionStatus?: string | null;
				planExpiresAt?: string | null;
		  }
		| null
		| undefined,
): boolean {
	if (!t?.id || !t.planId) return false;
	const st = String(t.subscriptionStatus ?? "").toLowerCase();
	if (st !== "active") return false;
	if (t.planExpiresAt) {
		return isFutureExpiry(t.planExpiresAt);
	}
	return true;
}

/**
 * Portal (Programs, Schedule, etc.) requires paid access:
 * - **Team billing**: coach’s managed team or an athlete rostered on a team with `subscriptionStatus` `active`
 *   and (if set) a future `team.planExpiresAt`.
 * - **Individual billing**: athlete/guardian with `programTier` and a future `planExpiresAt` (tiers alone are not enough).
 */
export function hasActivePortalSubscription(user: PortalUser): boolean {
	if (teamPortalSubscriptionActive(user.team)) {
		return true;
	}

	if (isCoachBillingRole(user.role)) {
		return false;
	}

	if (!user.programTier) return false;
	return isFutureExpiry(user.planExpiresAt ?? null);
}

/** True when this login is a team coach using the coach portal (one team), not an athlete/guardian account. */
export function isCoachPortalUser(user: PortalUser): boolean {
	const r = String(user.role ?? "").toLowerCase();
	return r === "coach" || r === "team_coach" || r === "program_coach";
}

/**
 * Plan / billing summary for the coach portal: driven by {@link PortalUser.team}, not athlete {@link PortalUser.programTier}.
 */
export function getCoachTeamPortalPlanSummary(user: PortalUser): {
	title: string;
	subtitle: string | null;
	expiresAt: string | null;
} {
	const t = user.team;
	if (!t?.id) {
		return {
			title: "Team workspace pending",
			subtitle: "Finish team onboarding so this dashboard links to your club.",
			expiresAt: null,
		};
	}
	if (!t.planId) {
		const teamLabel = String(t.name ?? "").trim() || "Your team";
		return {
			title: "No team plan yet",
			subtitle: `${teamLabel} — choose a plan in onboarding.`,
			expiresAt: null,
		};
	}
	const st =
		String(t.subscriptionStatus ?? "")
			.trim()
			.toLowerCase() || "unknown";
	const teamLabel = String(t.name ?? "").trim() || null;
	if (st === "active") {
		return {
			title: "Team subscription active",
			subtitle: teamLabel,
			expiresAt: t.planExpiresAt ?? null,
		};
	}
	const readable = st.replace(/_/g, " ");
	return {
		title: `Team billing: ${readable}`,
		subtitle: teamLabel,
		expiresAt: t.planExpiresAt ?? null,
	};
}
