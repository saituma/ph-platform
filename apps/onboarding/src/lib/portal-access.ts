import type { PortalUser } from "@/portal/PortalContext";

function isFutureExpiry(planExpiresAt: string | null | undefined): boolean {
	if (!planExpiresAt) return false;
	const t = new Date(planExpiresAt).getTime();
	if (Number.isNaN(t)) return false;
	return t > Date.now();
}

/**
 * Portal (Programs, Schedule, etc.) requires the same “paid access” signal as the dashboard:
 * a future {@link PortalUser.planExpiresAt} for athletes/guardians, not merely {@link PortalUser.programTier}
 * (tiers can be set for free/starter flows without payment).
 *
 * Coaches need an assigned plan and {@link PortalUser.team.subscriptionStatus} `active` (paid + approved in Stripe flow).
 */
export function hasActivePortalSubscription(user: PortalUser): boolean {
	const isTeam = user.role === "coach";

	if (isTeam) {
		const t = user.team;
		if (!t?.id || !t.planId) return false;
		const st = String(t.subscriptionStatus ?? "").toLowerCase();
		if (st !== "active") return false;
		if (t.planExpiresAt) {
			return isFutureExpiry(t.planExpiresAt);
		}
		return true;
	}

	if (!user.programTier) return false;
	return isFutureExpiry(user.planExpiresAt ?? null);
}

/** True when this login is a team coach using the coach portal (one team), not an athlete/guardian account. */
export function isCoachPortalUser(user: PortalUser): boolean {
	return user.role === "coach";
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
