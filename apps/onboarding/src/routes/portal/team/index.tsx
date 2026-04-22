import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { TeamAthletesSection } from "@/components/portal/TeamAthletesSection";
import { isPortalTeamRosterManagerRole } from "@/lib/portal-roles";
import { usePortal } from "@/portal/PortalContext";

export const Route = createFileRoute("/portal/team/")({
	component: TeamPage,
});

function TeamPage() {
	const { user } = usePortal();
	const canManageTeam = isPortalTeamRosterManagerRole(user?.role);

	return (
		<div className="container mx-auto max-w-3xl space-y-6 p-4 pb-24">
			<Link
				to="/portal/dashboard"
				className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
			>
				<ArrowLeft className="h-4 w-4" aria-hidden />
				Back to dashboard
			</Link>

			<div className="space-y-2">
				<h1 className="text-3xl font-black uppercase italic tracking-tight">
					Team roster
				</h1>
				<p className="text-muted-foreground leading-relaxed">
					Add players, set your team email segment, and share mobile-app logins.
					Athletes never use this web portal — they sign in on the PH mobile app
					only.
				</p>
			</div>

			{!canManageTeam ? (
				<div className="rounded-2xl border bg-muted/30 p-6 text-sm text-muted-foreground">
					<p>
						Team management is for team coaches and admins. If you’re an athlete
						or guardian, use the dashboard and other sections for your own
						profile.
					</p>
					<Link
						to="/portal/dashboard"
						className="mt-4 inline-flex font-bold text-primary hover:underline"
					>
						Go to dashboard
					</Link>
				</div>
			) : (
				<TeamAthletesSection showSectionTitle={false} />
			)}
		</div>
	);
}
