import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
	Activity,
	Bell,
	ChevronRight,
	CreditCard,
	Dumbbell,
	LayoutDashboard,
	Loader2,
	Utensils,
} from "lucide-react";
import { getClientAuthToken } from "@/lib/client-storage";
import {
	getCoachTeamPortalPlanSummary,
	isCoachPortalUser,
} from "@/lib/portal-access";
import { usePortal } from "@/portal/PortalContext";
import { fetchHomeContent, homeQueryKeys } from "@/services/homeService";
import { settingsService } from "@/services/settingsService";

export const homeKeys = homeQueryKeys;

export const Route = createFileRoute("/portal/dashboard")({
	loader: async ({ context: { queryClient } }) => {
		const token = getClientAuthToken();
		if (token) {
			await queryClient.ensureQueryData({
				queryKey: homeKeys.content(token),
				queryFn: () => fetchHomeContent(token),
			}).catch(() => null);
		}
	},
	component: DashboardPage,
});

function DashboardPage() {
	const {
		user,
		token,
		loading: portalLoading,
		error: portalError,
	} = usePortal();

	const {
		data: homeContent,
		isLoading: homeLoading,
		error: homeError,
	} = useQuery({
		queryKey: homeKeys.content(token),
		queryFn: () => {
			if (!token) throw new Error("Missing auth token");
			return fetchHomeContent(token);
		},
		enabled: !!token && !portalLoading,
		staleTime: 1000 * 60 * 5,
	});

	const { data: feedData, isLoading: feedLoading } = useQuery({
		queryKey: ["activity-feed"],
		queryFn: () => settingsService.getActivityFeed({ limit: 8 }),
		enabled: !portalLoading,
		staleTime: 1000 * 60 * 2,
	});

	if (portalLoading || (token && homeLoading && !homeContent)) {
		return (
			<div className="flex h-screen items-center justify-center pb-20">
				<div className="text-center">
					<div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
					<p className="mt-4 text-sm text-muted-foreground">
						Loading your dashboard...
					</p>
				</div>
			</div>
		);
	}

	if (portalError || !user) {
		return (
			<div className="flex h-screen items-center justify-center pb-20 px-4">
				<div className="text-center space-y-4">
					<p className="text-muted-foreground mb-4">
						{portalError || "Please log in to access your dashboard"}
					</p>
					<Link
						to="/login"
						className="px-4 py-2 border rounded-lg hover:bg-primary/10 inline-block"
					>
						Go to Login
					</Link>
				</div>
			</div>
		);
	}

	const isCoach = isCoachPortalUser(user);
	const coachPlan = isCoach ? getCoachTeamPortalPlanSummary(user) : null;
	const rosterTeamPlan =
		!isCoach && user.team?.id ? getCoachTeamPortalPlanSummary(user) : null;
	const displayName = isCoach
		? user.name
		: user.athleteName || user.name || "Athlete";
	const athletePlanLabel =
		user.programTier
			?.replace(/_+/g, " ")
			.replace(/\b\w/g, (c) => c.toUpperCase()) || "No Active Plan";
	const planCardTitle = isCoach
		? "Team plan"
		: user.team?.id
			? "Team & plan"
			: "Current Plan";
	const planPrimaryLabel = isCoach
		? (coachPlan?.title ?? "Team plan")
		: rosterTeamPlan?.title
			? rosterTeamPlan.title
			: athletePlanLabel;
	const planSecondary = isCoach
		? (coachPlan?.subtitle ?? null)
		: (rosterTeamPlan?.subtitle ??
			(user.team?.name?.trim() ? `Club: ${user.team.name.trim()}` : null));
	const planExpiresAt = isCoach
		? (user.team?.planExpiresAt ?? null)
		: (user.team?.planExpiresAt ?? user.planExpiresAt ?? null);
	const memberSinceLabel = isCoach
		? "Team since"
		: user.team?.createdAt
			? "Club member since"
			: "Member since";
	const memberSinceDate = isCoach
		? user.team?.createdAt || user.createdAt || new Date().toISOString()
		: user.team?.createdAt || user.createdAt || new Date().toISOString();
	const teamActiveWithoutExpiry =
		Boolean(user.team?.planId) &&
		String(user.team?.subscriptionStatus ?? "").toLowerCase() === "active" &&
		!planExpiresAt;

	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleDateString(undefined, {
			year: "numeric",
			month: "long",
			day: "numeric",
		});
	};

	const formatRelativeDate = (dateString: string) => {
		const diff = Date.now() - new Date(dateString).getTime();
		const days = Math.floor(diff / (1000 * 60 * 60 * 24));
		if (days === 0) return "Today";
		if (days === 1) return "Yesterday";
		if (days < 7) return `${days}d ago`;
		if (days < 30) return `${Math.floor(days / 7)}w ago`;
		return `${Math.floor(days / 30)}mo ago`;
	};

	return (
		<div className="container mx-auto p-4 pb-20 space-y-6">
			{homeError && (
				<div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
					{homeError instanceof Error
						? homeError.message
						: "Error loading dashboard"}
				</div>
			)}

			{/* Athlete hero from API */}
			{homeContent && !isCoach && (
				<div className="relative rounded-3xl overflow-hidden bg-primary/5 border border-primary/10 p-6 md:p-8">
					<div className="max-w-2xl">
						<h1 className="text-3xl md:text-4xl font-black italic uppercase tracking-tight text-foreground mb-2">
							{homeContent.headline || `Welcome back, ${displayName}!`}
						</h1>
						<p className="text-muted-foreground font-medium text-lg leading-relaxed">
							{homeContent.description || "Your daily performance overview."}
						</p>
						{user.team?.name?.trim() ? (
							<p className="mt-3 text-sm font-black uppercase tracking-widest text-primary">
								Club ·{" "}
								<span className="text-foreground normal-case font-bold tracking-normal">
									{user.team.name.trim()}
								</span>
							</p>
						) : null}
						{homeContent.introVideoUrl && (
							<a
								href={homeContent.introVideoUrl}
								target="_blank"
								rel="noopener noreferrer"
								className="inline-flex items-center gap-2 mt-6 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all"
							>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									width="20"
									height="20"
									viewBox="0 0 24 24"
									fill="currentColor"
									aria-hidden="true"
									focusable="false"
								>
									<path d="M8 5v14l11-7z" />
								</svg>
								Watch Intro
							</a>
						)}
					</div>
					{homeContent.heroImageUrl && (
						<div className="hidden lg:block absolute top-1/2 right-8 -translate-y-1/2 w-64 h-64 opacity-20">
							<img
								src={homeContent.heroImageUrl}
								alt=""
								className="w-full h-full object-contain"
							/>
						</div>
					)}
				</div>
			)}

			{/* Coach: card → detail page instead of full-width hero */}
			{isCoach && (
				<Link
					to="/portal/coach-app"
					className="group flex w-full items-stretch gap-4 rounded-2xl border border-primary/15 bg-card p-5 text-left shadow-sm transition-all hover:border-primary/35 hover:shadow-md md:p-6"
				>
					<div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary md:h-14 md:w-14">
						<LayoutDashboard className="h-6 w-6 md:h-7 md:w-7" aria-hidden />
					</div>
					<div className="min-w-0 flex-1">
						<p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
							Coach workspace
						</p>
						<h2 className="mt-1 text-lg font-black uppercase italic tracking-tight text-foreground md:text-xl">
							{homeContent?.headline?.trim() ||
								(user.team?.name?.trim()
									? `${user.team.name.trim()} — PH App`
									: "How coaches use this portal")}
						</h2>
						<p className="mt-2 text-sm text-muted-foreground leading-relaxed">
							Programs, schedule, and team tools here are for your squad only.
							Athletes use the mobile app — tap to read how it works.
						</p>
					</div>
					<div className="flex shrink-0 items-center self-center">
						<ChevronRight
							className="h-6 w-6 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary"
							aria-hidden
						/>
					</div>
				</Link>
			)}

			{!homeContent && !isCoach && (
				<div className="mb-6">
					<h1 className="text-3xl font-bold mb-2">
						Welcome back, {displayName}!
					</h1>
					<p className="text-muted-foreground">
						{user.role && user.role !== "athlete"
							? `Role: ${user.role}`
							: "Athlete dashboard"}
						{user.team?.name?.trim() ? (
							<span className="mt-2 block text-sm font-semibold text-primary">
								Club: {user.team.name.trim()}
							</span>
						) : null}
					</p>
				</div>
			)}

			<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
				{/* Plan Status Card */}
				<div className="md:col-span-2 rounded-2xl border bg-card p-6 shadow-sm">
					<div className="flex items-center justify-between mb-4">
						<div>
							<h2 className="text-xl font-semibold">{planCardTitle}</h2>
							<p className="text-primary font-medium">{planPrimaryLabel}</p>
							{planSecondary ? (
								<p className="text-sm text-muted-foreground mt-1">
									{planSecondary}
								</p>
							) : null}
						</div>
						<div className="text-right">
							<p className="text-sm text-muted-foreground">
								{memberSinceLabel}
							</p>
							<p className="font-medium">{formatDate(memberSinceDate)}</p>
						</div>
					</div>

					{planExpiresAt ? (
						<div className="pt-4 border-t">
							<div className="flex justify-between items-center mb-2">
								<p className="text-sm text-muted-foreground">Time Remaining</p>
								<p className="font-bold text-primary">
									{Math.ceil(
										(new Date(planExpiresAt).getTime() - Date.now()) /
											(1000 * 60 * 60 * 24),
									)}{" "}
									Days
								</p>
							</div>
							<div className="h-2 w-full bg-primary/10 rounded-full overflow-hidden">
								<div
									className="h-full bg-primary"
									style={{
										width: `${Math.max(0, Math.min(100, ((new Date(planExpiresAt).getTime() - Date.now()) / (30 * 24 * 60 * 60 * 1000)) * 100))}%`,
									}}
								/>
							</div>
							<p className="mt-2 text-xs text-muted-foreground">
								Expires on {formatDate(planExpiresAt)}
							</p>
						</div>
					) : teamActiveWithoutExpiry ? (
						<div className="pt-4 border-t">
							<p className="text-sm text-muted-foreground">
								{isCoach
									? "Team billing is active. A renewal or period end date is not stored on this team yet; you still have full portal access."
									: `Team billing is active${user.team?.name?.trim() ? ` for ${user.team.name.trim()}` : ""}. Renewal dates may not show here yet; you still have access through your club.`}
							</p>
						</div>
					) : (
						<div className="pt-4 border-t">
							<p className="text-sm text-muted-foreground">
								{isCoach
									? "No active team subscription on record yet. Complete team checkout (and admin approval if required), or open onboarding to pick a plan."
									: user.team?.name?.trim()
										? `No active subscription on record for ${user.team.name.trim()} or your personal plan. Ask your coach or explore plans to get started.`
										: "No active subscription found. Explore our plans to get started."}
							</p>
						</div>
					)}
				</div>

				{/* User Quick Info */}
				<div className="rounded-2xl border bg-card p-6 shadow-sm flex flex-col justify-between">
					<div className="space-y-4">
						<h2 className="text-lg font-semibold">
							{isCoach ? "Coach account" : "Profile Info"}
						</h2>
						<div className="space-y-2">
							{user.team?.id ? (
								<div className="flex justify-between text-sm gap-2">
									<span className="text-muted-foreground shrink-0">
										{isCoach ? "Team" : "Club"}
									</span>
									<span className="font-medium text-right">
										{user.team.name?.trim() || `Team #${user.team.id}`}
									</span>
								</div>
							) : null}
							<div className="flex justify-between text-sm">
								<span className="text-muted-foreground">Email</span>
								<span className="font-medium">{user.email}</span>
							</div>
							<div className="flex justify-between text-sm">
								<span className="text-muted-foreground">User ID</span>
								<span className="font-medium">#{user.id}</span>
							</div>
							{!isCoach && user.birthDate ? (
								<div className="flex justify-between text-sm">
									<span className="text-muted-foreground">Birth Date</span>
									<span className="font-medium">
										{formatDate(user.birthDate)}
									</span>
								</div>
							) : null}
						</div>
					</div>
					<button
						type="button"
						className="w-full mt-4 py-2 text-sm font-medium border rounded-lg hover:bg-muted transition-colors"
					>
						Edit Profile
					</button>
				</div>
			</div>

			{/* Navigation Grid */}
			<div className="grid grid-cols-2 md:grid-cols-3 gap-4">
				<Link
					to="/portal/programs"
					className="p-6 border rounded-2xl bg-card hover:border-primary hover:shadow-md transition-all group text-center"
				>
					<div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="24"
							height="24"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2.5"
							className="text-primary"
							aria-hidden="true"
							focusable="false"
						>
							<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
							<polyline points="9 22 9 12 15 12 15 22"></polyline>
						</svg>
					</div>
					<p className="font-bold">Programs</p>
				</Link>
				<Link
					to="/portal/schedule"
					className="p-6 border rounded-2xl bg-card hover:border-primary hover:shadow-md transition-all group text-center"
				>
					<div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="24"
							height="24"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2.5"
							className="text-primary"
							aria-hidden="true"
							focusable="false"
						>
							<rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
							<line x1="16" y1="2" x2="16" y2="6"></line>
							<line x1="8" y1="2" x2="8" y2="6"></line>
							<line x1="3" y1="10" x2="21" y2="10"></line>
						</svg>
					</div>
					<p className="font-bold">Schedule</p>
				</Link>
				<Link
					to="/portal/messages"
					className="p-6 border rounded-2xl bg-card hover:border-primary hover:shadow-md transition-all group text-center"
				>
					<div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="24"
							height="24"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2.5"
							className="text-primary"
							aria-hidden="true"
							focusable="false"
						>
							<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
						</svg>
					</div>
					<p className="font-bold">Messages</p>
				</Link>
			</div>

			{/* Activity Feed */}
			{!isCoach && (
				<div className="space-y-4">
					<div className="flex items-center justify-between px-1">
						<h2 className="text-xl font-bold">Recent Activity</h2>
						<Link
							to="/portal/nutrition"
							className="text-sm text-primary font-semibold hover:underline"
						>
							Log today →
						</Link>
					</div>

					{feedLoading ? (
						<div className="flex items-center justify-center rounded-2xl border bg-card py-10">
							<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
						</div>
					) : !feedData?.items?.length ? (
						<div className="rounded-2xl border bg-card/50 p-8 text-center">
							<Activity className="h-8 w-8 mx-auto text-muted-foreground/40 mb-3" />
							<p className="text-sm text-muted-foreground font-medium">
								No activity yet — start logging nutrition or complete a training session.
							</p>
						</div>
					) : (
						<div className="rounded-2xl border bg-card divide-y">
							{feedData.items.map((item: any) => (
								<div
									key={item.id}
									className="flex items-start gap-4 px-5 py-4"
								>
									<div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
										{item.icon === "utensils" ? (
											<Utensils className="h-4 w-4" />
										) : item.icon === "activity" ? (
											<Activity className="h-4 w-4" />
										) : item.icon === "credit-card" ? (
											<CreditCard className="h-4 w-4" />
										) : item.icon === "bell" ? (
											<Bell className="h-4 w-4" />
										) : (
											<Dumbbell className="h-4 w-4" />
										)}
									</div>
									<div className="min-w-0 flex-1">
										<p className="text-sm font-bold text-foreground leading-snug">
											{item.title}
										</p>
										{item.description && (
											<p className="text-xs text-muted-foreground mt-0.5 truncate">
												{item.description}
											</p>
										)}
									</div>
									<p className="shrink-0 text-xs text-muted-foreground">
										{formatRelativeDate(item.date)}
									</p>
								</div>
							))}
						</div>
					)}
				</div>
			)}

			{/* Testimonials: athlete-facing home content; omit on coach workspace */}
			{!isCoach &&
				homeContent?.testimonials &&
				homeContent.testimonials.length > 0 && (
					<div className="space-y-4">
						<h2 className="text-xl font-bold px-1">What Athletes Say</h2>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							{homeContent.testimonials.slice(0, 2).map((t) => (
								<div
									key={t.id}
									className="p-6 rounded-2xl border bg-card/50 italic text-muted-foreground relative"
								>
									<span className="text-4xl absolute top-4 left-4 opacity-10">
										"
									</span>
									<p className="relative z-10 mb-4">{t.quote}</p>
									<div className="flex items-center gap-3">
										{t.photoUrl && (
											<img
												src={t.photoUrl}
												alt=""
												className="w-8 h-8 rounded-full object-cover"
											/>
										)}
										<div>
											<p className="text-sm font-bold text-foreground not-italic">
												{t.name}
											</p>
											{t.role && <p className="text-xs not-italic">{t.role}</p>}
										</div>
									</div>
								</div>
							))}
						</div>
					</div>
				)}
		</div>
	);
}
