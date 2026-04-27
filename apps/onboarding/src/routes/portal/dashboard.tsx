import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
	Activity,
	Bell,
	Calendar,
	Clock,
	CreditCard,
	Dumbbell,
	Loader2,
	MessageSquare,
	Shield,
	TrendingUp,
	UserPlus,
	Users,
	Utensils,
} from "lucide-react";
import { getClientAuthToken } from "@/lib/client-storage";
import {
	getCoachTeamPortalPlanSummary,
	isCoachPortalUser,
} from "@/lib/portal-access";
import { usePortal } from "@/portal/PortalContext";
import { fetchHomeContent, homeQueryKeys } from "@/services/homeService";
import { fetchBookings, type ScheduleEvent } from "@/services/scheduleService";
import { settingsService } from "@/services/settingsService";
import { fetchTeamRoster } from "@/services/teamRosterService";

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
					<div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
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

	if (isCoach) {
		return <CoachDashboard user={user} token={token} homeContent={homeContent} homeError={homeError} />;
	}

	return (
		<AthleteDashboard
			user={user}
			token={token}
			homeContent={homeContent}
			homeError={homeError}
			feedData={feedData}
			feedLoading={feedLoading}
		/>
	);
}

/* ─── Coach Dashboard ─── */

function CoachDashboard({
	user,
	token,
	homeContent,
	homeError,
}: {
	user: NonNullable<ReturnType<typeof usePortal>["user"]>;
	token: string | null;
	homeContent: any;
	homeError: any;
}) {
	const coachPlan = getCoachTeamPortalPlanSummary(user);
	const teamName = user.team?.name?.trim() || "Your Team";

	const { data: roster } = useQuery({
		queryKey: ["teamRoster", token],
		queryFn: () => fetchTeamRoster(token!),
		enabled: !!token,
		staleTime: 1000 * 60 * 5,
	});

	const { data: bookings = [] } = useQuery({
		queryKey: ["schedule", "bookings", token],
		queryFn: () => fetchBookings(token!),
		enabled: !!token,
		staleTime: 1000 * 60 * 5,
	});

	const planExpiresAt = user.team?.planExpiresAt ?? null;
	const daysRemaining = planExpiresAt
		? Math.ceil((new Date(planExpiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
		: null;
	const memberCount = roster?.team?.memberCount ?? 0;
	const maxAthletes = roster?.team?.maxAthletes ?? user.team?.maxAthletes ?? 0;
	const slotsRemaining = roster?.team?.slotsRemaining ?? (maxAthletes - memberCount);
	const pendingBookings = bookings.filter((b) => b.status === "pending");
	const upcomingBookings = bookings
		.filter((b) => new Date(b.startsAt) >= new Date() && b.status !== "pending")
		.slice(0, 3);

	const formatDate = (dateString: string) =>
		new Date(dateString).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });

	return (
		<div className="container mx-auto p-4 pb-20 space-y-6">
			{homeError && (
				<div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
					{homeError instanceof Error ? homeError.message : "Error loading dashboard"}
				</div>
			)}

			{/* Hero */}
			<div className="relative rounded-[2rem] overflow-hidden bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/10 p-8 md:p-10">
				<div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/4" />
				<div className="relative z-10">
					<div className="flex items-center gap-3 mb-2">
						<div className="h-10 w-10 rounded-xl bg-primary/15 flex items-center justify-center">
							<Shield className="h-5 w-5 text-primary" />
						</div>
						<p className="text-xs font-black uppercase tracking-widest text-primary">Coach Dashboard</p>
					</div>
					<h1 className="text-3xl md:text-4xl font-black italic uppercase tracking-tight">
						{teamName}
					</h1>
					<p className="mt-2 text-muted-foreground font-medium leading-relaxed max-w-xl">
						{homeContent?.description || "Manage your squad, programs, and schedule from one place."}
					</p>
				</div>
			</div>

			{/* Stat Cards */}
			<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
				<StatCard
					label="Athletes"
					value={String(memberCount)}
					sub={`of ${maxAthletes} slots`}
					icon={<Users className="h-5 w-5" />}
					accent="text-blue-500 bg-blue-500/10"
				/>
				<StatCard
					label="Open Slots"
					value={String(Math.max(0, slotsRemaining))}
					sub="available"
					icon={<UserPlus className="h-5 w-5" />}
					accent="text-emerald-500 bg-emerald-500/10"
				/>
				<StatCard
					label="Pending"
					value={String(pendingBookings.length)}
					sub="booking requests"
					icon={<Clock className="h-5 w-5" />}
					accent="text-amber-500 bg-amber-500/10"
				/>
				<StatCard
					label="Plan"
					value={daysRemaining != null ? `${daysRemaining}d` : "Active"}
					sub={daysRemaining != null ? "remaining" : (coachPlan?.title ?? "Team plan")}
					icon={<CreditCard className="h-5 w-5" />}
					accent="text-purple-500 bg-purple-500/10"
				/>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
				{/* Left column: main content */}
				<div className="lg:col-span-2 space-y-6">
					{/* Quick Actions */}
					<div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
						<QuickAction to="/portal/programs" icon={<Dumbbell className="h-5 w-5" />} label="Programs" />
						<QuickAction to="/portal/schedule" icon={<Calendar className="h-5 w-5" />} label="Schedule" />
						<QuickAction to="/portal/messages" icon={<MessageSquare className="h-5 w-5" />} label="Messages" />
						<QuickAction to="/portal/team" icon={<Users className="h-5 w-5" />} label="Team" />
					</div>

					{/* Upcoming Sessions */}
					<section className="rounded-[2rem] border bg-card p-6 space-y-4">
						<div className="flex items-center justify-between">
							<h2 className="text-lg font-bold uppercase italic tracking-tight">Upcoming Sessions</h2>
							<Link to="/portal/schedule" className="text-xs font-bold text-primary hover:underline">
								View all
							</Link>
						</div>
						{upcomingBookings.length > 0 ? (
							<div className="space-y-3">
								{upcomingBookings.map((b) => (
									<BookingRow key={b.id} booking={b} />
								))}
							</div>
						) : (
							<div className="py-8 text-center text-sm text-muted-foreground">
								<Calendar className="h-8 w-8 mx-auto mb-2 opacity-30" />
								No upcoming sessions scheduled.
							</div>
						)}
					</section>

					{/* Pending Requests */}
					{pendingBookings.length > 0 && (
						<section className="rounded-[2rem] border border-amber-500/20 bg-amber-500/5 p-6 space-y-4">
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-2">
									<div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
									<h2 className="text-lg font-bold uppercase italic tracking-tight">Pending Requests</h2>
								</div>
								<span className="text-xs font-black uppercase tracking-widest text-amber-500">
									{pendingBookings.length} awaiting
								</span>
							</div>
							<div className="space-y-3">
								{pendingBookings.slice(0, 5).map((b) => (
									<BookingRow key={b.id} booking={b} />
								))}
							</div>
						</section>
					)}
				</div>

				{/* Right column: sidebar */}
				<div className="space-y-6">
					{/* Plan Card */}
					<div className="rounded-[2rem] border bg-card p-6 space-y-4">
						<div className="flex items-center justify-between">
							<h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
								Team Plan
							</h3>
							<Link to="/portal/billing" className="text-xs text-primary font-bold hover:underline">
								Manage
							</Link>
						</div>
						<div>
							<p className="text-2xl font-black italic uppercase tracking-tight">
								{coachPlan?.title ?? "Active"}
							</p>
							{coachPlan?.subtitle && (
								<p className="text-sm text-muted-foreground mt-1">{coachPlan.subtitle}</p>
							)}
						</div>
						{planExpiresAt && daysRemaining != null && (
							<div className="space-y-2">
								<div className="flex justify-between text-sm">
									<span className="text-muted-foreground">Expires</span>
									<span className="font-medium">{formatDate(planExpiresAt)}</span>
								</div>
								<div className="h-2 w-full bg-primary/10 rounded-full overflow-hidden">
									<div
										className="h-full bg-primary rounded-full transition-all"
										style={{
											width: `${Math.max(2, Math.min(100, (daysRemaining / 365) * 100))}%`,
										}}
									/>
								</div>
								<p className="text-xs text-muted-foreground text-center">
									{daysRemaining} days remaining
								</p>
							</div>
						)}
					</div>

					{/* Roster Snapshot */}
					<div className="rounded-[2rem] border bg-card p-6 space-y-4">
						<div className="flex items-center justify-between">
							<h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
								Roster
							</h3>
							<Link to="/portal/team" className="text-xs text-primary font-bold hover:underline">
								View all
							</Link>
						</div>
						{roster?.members && roster.members.length > 0 ? (
							<div className="space-y-2">
								{roster.members.slice(0, 5).map((m) => (
									<div key={m.athleteId} className="flex items-center gap-3 py-1.5">
										<div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
											{m.name?.slice(0, 2).toUpperCase() || "?"}
										</div>
										<div className="min-w-0 flex-1">
											<p className="text-sm font-semibold truncate">{m.name}</p>
											<p className="text-[10px] text-muted-foreground uppercase tracking-wider">
												Age {m.age}
											</p>
										</div>
									</div>
								))}
								{roster.members.length > 5 && (
									<Link
										to="/portal/team"
										className="block text-center text-xs font-bold text-primary hover:underline pt-2"
									>
										+{roster.members.length - 5} more athletes
									</Link>
								)}
							</div>
						) : (
							<div className="py-6 text-center text-sm text-muted-foreground">
								<Users className="h-6 w-6 mx-auto mb-2 opacity-30" />
								No athletes yet.
								<Link to="/portal/team" className="block text-primary font-bold mt-2 hover:underline">
									Add athletes
								</Link>
							</div>
						)}
					</div>

					{/* Coach Info */}
					<div className="rounded-[2rem] border bg-card/50 p-6 space-y-3">
						<h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
							Account
						</h3>
						<div className="space-y-2 text-sm">
							<div className="flex justify-between">
								<span className="text-muted-foreground">Email</span>
								<span className="font-medium truncate ml-4">{user.email}</span>
							</div>
							<div className="flex justify-between">
								<span className="text-muted-foreground">ID</span>
								<span className="font-medium">#{user.id}</span>
							</div>
							<div className="flex justify-between">
								<span className="text-muted-foreground">Role</span>
								<span className="font-medium capitalize">{user.role?.replace(/_/g, " ")}</span>
							</div>
						</div>
						<Link
							to="/portal/profile"
							className="block w-full text-center py-2 text-sm font-medium border rounded-xl hover:bg-muted transition-colors mt-2"
						>
							Edit Profile
						</Link>
					</div>
				</div>
			</div>
		</div>
	);
}

function StatCard({ label, value, sub, icon, accent }: {
	label: string;
	value: string;
	sub: string;
	icon: React.ReactNode;
	accent: string;
}) {
	return (
		<div className="rounded-2xl border bg-card p-5 space-y-3">
			<div className="flex items-center justify-between">
				<p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{label}</p>
				<div className={`h-9 w-9 rounded-xl flex items-center justify-center ${accent}`}>
					{icon}
				</div>
			</div>
			<div>
				<p className="text-2xl font-black tracking-tight">{value}</p>
				<p className="text-xs text-muted-foreground">{sub}</p>
			</div>
		</div>
	);
}

function QuickAction({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
	return (
		<Link
			to={to}
			className="flex flex-col items-center gap-2 p-4 rounded-2xl border bg-card hover:border-primary/40 hover:shadow-md transition-all group"
		>
			<div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
				{icon}
			</div>
			<p className="text-xs font-bold uppercase tracking-wider">{label}</p>
		</Link>
	);
}

function BookingRow({ booking }: { booking: ScheduleEvent }) {
	const statusColors: Record<string, string> = {
		confirmed: "bg-green-500/10 text-green-500",
		pending: "bg-amber-500/10 text-amber-500",
		declined: "bg-destructive/10 text-destructive",
		cancelled: "bg-muted text-muted-foreground",
	};
	return (
		<div className="flex items-center gap-4 p-3 rounded-xl bg-background/50 border border-transparent hover:border-border transition-colors">
			<div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
				<Calendar className="h-4 w-4" />
			</div>
			<div className="min-w-0 flex-1">
				<p className="text-sm font-bold truncate">{booking.title}</p>
				<p className="text-xs text-muted-foreground">
					{new Date(booking.startsAt).toLocaleDateString(undefined, {
						weekday: "short", month: "short", day: "numeric",
					})}{" "}
					· {booking.timeStart}
				</p>
			</div>
			{booking.status && (
				<span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${statusColors[booking.status] ?? ""}`}>
					{booking.status}
				</span>
			)}
		</div>
	);
}

/* ─── Athlete Dashboard (unchanged logic, original layout) ─── */

function AthleteDashboard({
	user,
	token,
	homeContent,
	homeError,
	feedData,
	feedLoading,
}: {
	user: NonNullable<ReturnType<typeof usePortal>["user"]>;
	token?: string | null;
	homeContent: any;
	homeError: any;
	feedData: any;
	feedLoading: boolean;
}) {
	void token;
	const rosterTeamPlan = user.team?.id ? getCoachTeamPortalPlanSummary(user) : null;
	const displayName = user.athleteName || user.name || "Athlete";
	const athletePlanLabel =
		user.programTier
			?.replace(/_+/g, " ")
			.replace(/\b\w/g, (c) => c.toUpperCase()) || "No Active Plan";
	const planCardTitle = user.team?.id ? "Team & plan" : "Current Plan";
	const planPrimaryLabel = rosterTeamPlan?.title ? rosterTeamPlan.title : athletePlanLabel;
	const planSecondary =
		rosterTeamPlan?.subtitle ??
		(user.team?.name?.trim() ? `Club: ${user.team.name.trim()}` : null);
	const planExpiresAt = user.team?.planExpiresAt ?? user.planExpiresAt ?? null;
	const memberSinceLabel = user.team?.createdAt ? "Club member since" : "Member since";
	const memberSinceDate = user.team?.createdAt || user.createdAt || new Date().toISOString();
	const teamActiveWithoutExpiry =
		Boolean(user.team?.planId) &&
		String(user.team?.subscriptionStatus ?? "").toLowerCase() === "active" &&
		!planExpiresAt;

	const formatDate = (dateString: string) =>
		new Date(dateString).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });

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
					{homeError instanceof Error ? homeError.message : "Error loading dashboard"}
				</div>
			)}

			{homeContent && (
				<div className="relative rounded-3xl overflow-hidden bg-primary/5 border border-primary/10 p-6 md:p-8">
					<div className="max-w-2xl">
						<h1 className="text-3xl md:text-4xl font-black italic uppercase tracking-tight text-foreground mb-2">
							{homeContent.headline || `Welcome back, ${displayName}!`}
						</h1>
						<p className="text-muted-foreground font-medium text-lg leading-relaxed">
							{homeContent.description || "Your daily performance overview."}
						</p>
						{user.team?.name?.trim() && (
							<p className="mt-3 text-sm font-black uppercase tracking-widest text-primary">
								Club · <span className="text-foreground normal-case font-bold tracking-normal">{user.team.name.trim()}</span>
							</p>
						)}
						{homeContent.introVideoUrl && (
							<a
								href={homeContent.introVideoUrl}
								target="_blank"
								rel="noopener noreferrer"
								className="inline-flex items-center gap-2 mt-6 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all"
							>
								<TrendingUp className="h-5 w-5" />
								Watch Intro
							</a>
						)}
					</div>
					{homeContent.heroImageUrl && (
						<div className="hidden lg:block absolute top-1/2 right-8 -translate-y-1/2 w-64 h-64 opacity-20">
							<img src={homeContent.heroImageUrl} alt="" className="w-full h-full object-contain" />
						</div>
					)}
				</div>
			)}

			{!homeContent && (
				<div className="mb-6">
					<h1 className="text-3xl font-bold mb-2">Welcome back, {displayName}!</h1>
					<p className="text-muted-foreground">
						{user.role && user.role !== "athlete" ? `Role: ${user.role}` : "Athlete dashboard"}
						{user.team?.name?.trim() && (
							<span className="mt-2 block text-sm font-semibold text-primary">Club: {user.team.name.trim()}</span>
						)}
					</p>
				</div>
			)}

			<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
				<div className="md:col-span-2 rounded-2xl border bg-card p-6 shadow-sm">
					<div className="flex items-center justify-between mb-4">
						<div>
							<h2 className="text-xl font-semibold">{planCardTitle}</h2>
							<p className="text-primary font-medium">{planPrimaryLabel}</p>
							{planSecondary && <p className="text-sm text-muted-foreground mt-1">{planSecondary}</p>}
						</div>
						<div className="text-right">
							<p className="text-sm text-muted-foreground">{memberSinceLabel}</p>
							<p className="font-medium">{formatDate(memberSinceDate)}</p>
						</div>
					</div>
					{planExpiresAt ? (
						<div className="pt-4 border-t">
							<div className="flex justify-between items-center mb-2">
								<p className="text-sm text-muted-foreground">Time Remaining</p>
								<p className="font-bold text-primary">
									{Math.ceil((new Date(planExpiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))} Days
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
							<p className="mt-2 text-xs text-muted-foreground">Expires on {formatDate(planExpiresAt)}</p>
						</div>
					) : teamActiveWithoutExpiry ? (
						<div className="pt-4 border-t">
							<p className="text-sm text-muted-foreground">
								Team billing is active{user.team?.name?.trim() ? ` for ${user.team.name.trim()}` : ""}. Renewal dates may not show here yet; you still have access through your club.
							</p>
						</div>
					) : (
						<div className="pt-4 border-t">
							<p className="text-sm text-muted-foreground">
								{user.team?.name?.trim()
									? `No active subscription on record for ${user.team.name.trim()} or your personal plan.`
									: "No active subscription found. Explore our plans to get started."}
							</p>
						</div>
					)}
				</div>

				<div className="rounded-2xl border bg-card p-6 shadow-sm flex flex-col justify-between">
					<div className="space-y-4">
						<h2 className="text-lg font-semibold">Profile Info</h2>
						<div className="space-y-2">
							{user.team?.id && (
								<div className="flex justify-between text-sm gap-2">
									<span className="text-muted-foreground shrink-0">Club</span>
									<span className="font-medium text-right">{user.team.name?.trim() || `Team #${user.team.id}`}</span>
								</div>
							)}
							<div className="flex justify-between text-sm">
								<span className="text-muted-foreground">Email</span>
								<span className="font-medium">{user.email}</span>
							</div>
							<div className="flex justify-between text-sm">
								<span className="text-muted-foreground">User ID</span>
								<span className="font-medium">#{user.id}</span>
							</div>
							{user.birthDate && (
								<div className="flex justify-between text-sm">
									<span className="text-muted-foreground">Birth Date</span>
									<span className="font-medium">{formatDate(user.birthDate)}</span>
								</div>
							)}
						</div>
					</div>
					<Link
						to="/portal/profile"
						className="block w-full mt-4 py-2 text-sm font-medium border rounded-lg hover:bg-muted transition-colors text-center"
					>
						Edit Profile
					</Link>
				</div>
			</div>

			<div className="grid grid-cols-2 md:grid-cols-3 gap-4">
				<Link to="/portal/programs" className="p-6 border rounded-2xl bg-card hover:border-primary hover:shadow-md transition-all group text-center">
					<div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
						<Dumbbell className="h-6 w-6 text-primary" />
					</div>
					<p className="font-bold">Programs</p>
				</Link>
				<Link to="/portal/schedule" className="p-6 border rounded-2xl bg-card hover:border-primary hover:shadow-md transition-all group text-center">
					<div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
						<Calendar className="h-6 w-6 text-primary" />
					</div>
					<p className="font-bold">Schedule</p>
				</Link>
				<Link to="/portal/messages" className="p-6 border rounded-2xl bg-card hover:border-primary hover:shadow-md transition-all group text-center">
					<div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
						<MessageSquare className="h-6 w-6 text-primary" />
					</div>
					<p className="font-bold">Messages</p>
				</Link>
			</div>

			{/* Activity Feed */}
			<div className="space-y-4">
				<div className="flex items-center justify-between px-1">
					<h2 className="text-xl font-bold">Recent Activity</h2>
					<Link to="/portal/nutrition" className="text-sm text-primary font-semibold hover:underline">
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
							<div key={item.id} className="flex items-start gap-4 px-5 py-4">
								<div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
									{item.icon === "utensils" ? <Utensils className="h-4 w-4" /> :
									 item.icon === "activity" ? <Activity className="h-4 w-4" /> :
									 item.icon === "credit-card" ? <CreditCard className="h-4 w-4" /> :
									 item.icon === "bell" ? <Bell className="h-4 w-4" /> :
									 <Dumbbell className="h-4 w-4" />}
								</div>
								<div className="min-w-0 flex-1">
									<p className="text-sm font-bold text-foreground leading-snug">{item.title}</p>
									{item.description && (
										<p className="text-xs text-muted-foreground mt-0.5 truncate">{item.description}</p>
									)}
								</div>
								<p className="shrink-0 text-xs text-muted-foreground">{formatRelativeDate(item.date)}</p>
							</div>
						))}
					</div>
				)}
			</div>

			{homeContent?.testimonials && homeContent.testimonials.length > 0 && (
				<div className="space-y-4">
					<h2 className="text-xl font-bold px-1">What Athletes Say</h2>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						{homeContent.testimonials.slice(0, 2).map((t: any) => (
							<div key={t.id} className="p-6 rounded-2xl border bg-card/50 italic text-muted-foreground relative">
								<span className="text-4xl absolute top-4 left-4 opacity-10">"</span>
								<p className="relative z-10 mb-4">{t.quote}</p>
								<div className="flex items-center gap-3">
									{t.photoUrl && <img src={t.photoUrl} alt="" className="w-8 h-8 rounded-full object-cover" />}
									<div>
										<p className="text-sm font-bold text-foreground not-italic">{t.name}</p>
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
