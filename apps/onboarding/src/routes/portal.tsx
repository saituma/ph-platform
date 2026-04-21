import { createFileRoute, Outlet } from "@tanstack/react-router";
import { BottomNav } from "@/components/BottomNav";
import { PortalProvider } from "@/portal/PortalContext";
import { ProtectedLayout } from "@/portal/ProtectedLayout";
import { usePortal } from "@/portal/PortalContext";
import { useNavigate } from "@tanstack/react-router";

export const Route = createFileRoute("/portal")({
	component: PortalLayout,
});

function PortalLayout() {
	return (
		<ProtectedLayout>
			<PortalProvider>
				<PortalGate />
			</PortalProvider>
		</ProtectedLayout>
	);
}

function PortalGate() {
	const navigate = useNavigate();
	const { user, loading, error } = usePortal();

	if (loading) {
		return (
			<div className="flex h-screen items-center justify-center">
				<div className="text-center">
					<div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
					<p className="mt-4 text-sm text-muted-foreground">Loading your account...</p>
				</div>
			</div>
		);
	}

	if (error || !user) {
		return (
			<div className="flex h-screen items-center justify-center px-4">
				<div className="text-center space-y-3">
					<p className="text-sm text-muted-foreground">{error || "Please log in again."}</p>
					<button
						type="button"
						onClick={() => navigate({ to: "/login" })}
						className="inline-flex items-center justify-center rounded-2xl border border-border/60 bg-background/60 px-5 py-3 text-sm font-black uppercase tracking-wider hover:bg-accent transition-all"
					>
						Go to Login
					</button>
				</div>
			</div>
		);
	}

	const isTeam = user.role === "coach";

	const missing: string[] = [];
	if (isTeam) {
		if (!user.team?.name?.trim()) missing.push("Team / club name");
		if (!Number.isFinite(Number(user.team?.minAge))) missing.push("Min age");
		if (!Number.isFinite(Number(user.team?.maxAge))) missing.push("Max age");
		if (!Number.isFinite(Number(user.team?.maxAthletes))) missing.push("Expected athletes");
	} else {
		if (!user.birthDate) missing.push("Birth date");
		if (!Number(user.trainingPerWeek ?? 0)) missing.push("Training frequency");
		if (!String(user.performanceGoals ?? "").trim()) missing.push("Performance goals");
		if (!String(user.phoneNumber ?? "").trim()) missing.push("Phone number");
		if (!String(user.equipmentAccess ?? "").trim()) missing.push("Equipment access");
	}

	const onboardingIncomplete = isTeam ? !user.team?.id : !user.onboardingCompleted;
	const needsPlan = isTeam ? !user.team?.planId : !user.programTier;
	const isBlocked = onboardingIncomplete || needsPlan;

	if (isBlocked) {
		const primaryAction = () => {
			if (onboardingIncomplete) {
				if (isTeam) {
					localStorage.setItem("user_type", "team");
					if (user.email) localStorage.setItem("pending_email", user.email);
					if (user.team?.id) {
						localStorage.setItem(
							"team_onboarding_basic",
							JSON.stringify({
								teamId: user.team.id,
								teamName: user.team.name,
								minAge: user.team.minAge,
								maxAge: user.team.maxAge,
								maxAthletes: user.team.maxAthletes,
							}),
						);
					}
					navigate({ to: "/onboarding/step-2" });
					return;
				}

				if (!user.birthDate) {
					navigate({ to: "/onboarding/step-2" });
					return;
				}
				if (
					!Number(user.trainingPerWeek ?? 0) ||
					!String(user.performanceGoals ?? "").trim() ||
					!String(user.phoneNumber ?? "").trim() ||
					!String(user.equipmentAccess ?? "").trim()
				) {
					navigate({ to: "/onboarding/step-3" });
					return;
				}
				navigate({ to: "/onboarding/step-4" });
				return;
			}

			// Onboarding done, but no plan.
			if (isTeam && user.team?.id) {
				localStorage.setItem("user_type", "team");
				if (user.email) localStorage.setItem("pending_email", user.email);
				localStorage.setItem(
					"team_onboarding_basic",
					JSON.stringify({
						teamId: user.team.id,
						teamName: user.team.name,
						minAge: user.team.minAge,
						maxAge: user.team.maxAge,
						maxAthletes: user.team.maxAthletes,
					}),
				);
			}
			navigate({ to: "/onboarding/step-5" });
		};

		return (
			<div className="min-h-screen flex items-center justify-center px-4 py-12">
				<div className="w-full max-w-xl rounded-[2.5rem] border border-primary/20 bg-primary/5 p-8 shadow-xl">
					<p className="text-xs font-black uppercase tracking-widest text-primary">
						Action Required
					</p>
					<h1 className="mt-3 text-3xl font-black tracking-tight uppercase italic">
						Finish Onboarding
					</h1>
					<p className="mt-2 text-sm text-muted-foreground font-medium leading-relaxed">
						{isTeam
							? "Add your team details and choose a plan to unlock Programs, Schedule, Tracking, and Messages."
							: "Complete onboarding and choose a plan to unlock Programs, Schedule, Tracking, and Messages."}
					</p>

					{onboardingIncomplete && missing.length > 0 && (
						<div className="mt-6 space-y-2">
							<p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
								Missing
							</p>
							<div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
								{missing.map((item) => (
									<div
										key={item}
										className="rounded-2xl border border-border/60 bg-background/50 px-4 py-3 text-sm font-semibold text-foreground"
									>
										{item}
									</div>
								))}
							</div>
						</div>
					)}

					{!onboardingIncomplete && needsPlan && (
						<div className="mt-6 rounded-2xl border border-border/60 bg-background/50 px-4 py-3 text-sm font-medium text-muted-foreground">
							No active subscription found. Choose a plan to continue.
						</div>
					)}

					<div className="mt-8 flex flex-col sm:flex-row gap-3">
						<button
							type="button"
							onClick={primaryAction}
							className="flex-1 inline-flex items-center justify-center rounded-2xl bg-primary px-5 py-3 text-sm font-black uppercase tracking-wider text-primary-foreground shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
						>
							{onboardingIncomplete ? (isTeam ? "Add Team Details" : "Continue Onboarding") : "Choose a Plan"}
						</button>
						<button
							type="button"
							onClick={() => {
								localStorage.removeItem("auth_token");
								localStorage.removeItem("user_type");
								localStorage.removeItem("pending_email");
								navigate({ to: "/login" });
							}}
							className="flex-1 inline-flex items-center justify-center rounded-2xl border border-border/60 bg-background/60 px-5 py-3 text-sm font-black uppercase tracking-wider hover:bg-accent transition-all"
						>
							Log Out
						</button>
					</div>
				</div>
			</div>
		);
	}

	return (
		<BottomNav>
			<Outlet />
		</BottomNav>
	);
}
