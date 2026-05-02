import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
	Activity,
	Bell,
	Calendar,
	Clock,
	CreditCard,
	Dumbbell,
	MessageSquare,
	Shield,
	TrendingUp,
	UserPlus,
	Users,
	Utensils,
} from "lucide-react";
import { getTokenStatus } from "@/lib/client-storage";
import {
	motion,
	PageTransition,
	StaggerList,
	StaggerItem,
	SkeletonDashboard,
	staggerItem,
	fadeUp,
	scaleIn,
} from "@/lib/motion";
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
		const status = await getTokenStatus();
		if (status.authenticated) {
			await queryClient.ensureQueryData({
				queryKey: homeKeys.content("cookie"),
				queryFn: () => fetchHomeContent(),
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
		return <SkeletonDashboard />;
	}

	if (portalError || !user) {
		return (
			<PageTransition>
				<div className="flex h-screen items-center justify-center pb-20 px-4">
					<motion.div
						initial={{ opacity: 0, scale: 0.95 }}
						animate={{ opacity: 1, scale: 1 }}
						transition={{ duration: 0.4 }}
						className="text-center space-y-4"
					>
						<p className="text-sm text-muted-foreground">
							{portalError || "Please log in to access your dashboard"}
						</p>
						<Link
							to="/login"
							className="inline-block bg-primary text-primary-foreground px-5 py-2.5 font-mono text-xs uppercase tracking-wider hover:opacity-90 transition-colors"
						>
							Go to Login
						</Link>
					</motion.div>
				</div>
			</PageTransition>
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
		<PageTransition className="max-w-6xl mx-auto p-4 md:p-6 pb-20 space-y-6">
			{homeError && (
				<motion.div
					initial={{ opacity: 0, height: 0 }}
					animate={{ opacity: 1, height: "auto" }}
					className="border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"
				>
					{homeError instanceof Error ? homeError.message : "Error loading dashboard"}
				</motion.div>
			)}

			{/* Hero */}
			<motion.div
				variants={fadeUp}
				initial="hidden"
				animate="visible"
				className="border border-foreground/[0.06] p-6 md:p-8 group hover:border-foreground/[0.1] transition-colors duration-300"
			>
				<div className="flex items-center gap-3 mb-3">
					<motion.div
						initial={{ rotate: -10, opacity: 0 }}
						animate={{ rotate: 0, opacity: 1 }}
						transition={{ delay: 0.2, duration: 0.4, type: "spring" }}
						className="h-8 w-8 bg-foreground/10 flex items-center justify-center"
					>
						<Shield className="h-4 w-4 text-foreground/60" />
					</motion.div>
					<p className="font-mono text-[10px] uppercase tracking-wider text-foreground/40">Coach Dashboard</p>
				</div>
				<motion.h1
					initial={{ opacity: 0, x: -10 }}
					animate={{ opacity: 1, x: 0 }}
					transition={{ delay: 0.15, duration: 0.5 }}
					className="text-2xl md:text-3xl font-medium tracking-tight text-foreground"
				>
					{teamName}
				</motion.h1>
				<motion.p
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					transition={{ delay: 0.3, duration: 0.5 }}
					className="mt-2 text-sm text-muted-foreground leading-relaxed max-w-xl"
				>
					{homeContent?.description || "Manage your squad, programs, and schedule from one place."}
				</motion.p>
			</motion.div>

			{/* Stat Cards */}
			<StaggerList className="grid grid-cols-2 md:grid-cols-4 border border-foreground/[0.06] divide-x divide-y md:divide-y-0 divide-foreground/[0.06]">
				<StaggerItem><StatCard label="Athletes" value={String(memberCount)} sub={`of ${maxAthletes} slots`} icon={<Users className="h-4 w-4" />} /></StaggerItem>
				<StaggerItem><StatCard label="Open Slots" value={String(Math.max(0, slotsRemaining))} sub="available" icon={<UserPlus className="h-4 w-4" />} /></StaggerItem>
				<StaggerItem><StatCard label="Pending" value={String(pendingBookings.length)} sub="booking requests" icon={<Clock className="h-4 w-4" />} /></StaggerItem>
				<StaggerItem><StatCard label="Plan" value={daysRemaining != null ? `${daysRemaining}d` : "Active"} sub={daysRemaining != null ? "remaining" : (coachPlan?.title ?? "Team plan")} icon={<CreditCard className="h-4 w-4" />} /></StaggerItem>
			</StaggerList>

			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
				<div className="lg:col-span-2 space-y-6">
					{/* Quick Actions */}
					<StaggerList className="grid grid-cols-2 sm:grid-cols-4 gap-3">
						<StaggerItem><QuickAction to="/portal/programs" icon={<Dumbbell className="h-4 w-4" />} label="Programs" /></StaggerItem>
						<StaggerItem><QuickAction to="/portal/schedule" icon={<Calendar className="h-4 w-4" />} label="Schedule" /></StaggerItem>
						<StaggerItem><QuickAction to="/portal/messages" icon={<MessageSquare className="h-4 w-4" />} label="Messages" /></StaggerItem>
						<StaggerItem><QuickAction to="/portal/team" icon={<Users className="h-4 w-4" />} label="Team" /></StaggerItem>
					</StaggerList>

					{/* Upcoming Sessions */}
					<motion.section
						variants={fadeUp}
						initial="hidden"
						animate="visible"
						transition={{ delay: 0.3 }}
						className="border border-foreground/[0.06] p-6 space-y-4"
					>
						<div className="flex items-center justify-between">
							<h2 className="font-mono text-xs uppercase tracking-wider text-foreground">Upcoming Sessions</h2>
							<Link to="/portal/schedule" className="font-mono text-[10px] uppercase tracking-wider text-foreground/40 hover:text-foreground transition-colors">
								View all
							</Link>
						</div>
						{upcomingBookings.length > 0 ? (
							<StaggerList className="space-y-2">
								{upcomingBookings.map((b) => (
									<StaggerItem key={b.id}><BookingRow booking={b} /></StaggerItem>
								))}
							</StaggerList>
						) : (
							<div className="py-8 text-center">
								<Calendar className="h-6 w-6 mx-auto mb-2 text-foreground/20" />
								<p className="text-sm text-muted-foreground">No upcoming sessions scheduled.</p>
							</div>
						)}
					</motion.section>

					{/* Pending Requests */}
					{pendingBookings.length > 0 && (
						<motion.section
							variants={fadeUp}
							initial="hidden"
							animate="visible"
							className="border border-foreground/[0.06] p-6 space-y-4"
						>
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-2">
									<motion.div
										animate={{ scale: [1, 1.3, 1] }}
										transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
										className="h-1.5 w-1.5 rounded-full bg-primary"
									/>
									<h2 className="font-mono text-xs uppercase tracking-wider text-foreground">Pending Requests</h2>
								</div>
								<span className="font-mono text-[10px] uppercase tracking-wider text-foreground/40">
									{pendingBookings.length} awaiting
								</span>
							</div>
							<StaggerList className="space-y-2">
								{pendingBookings.slice(0, 5).map((b) => (
									<StaggerItem key={b.id}><BookingRow booking={b} /></StaggerItem>
								))}
							</StaggerList>
						</motion.section>
					)}
				</div>

				{/* Right column */}
				<motion.div
					initial="hidden"
					animate="visible"
					variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.1, delayChildren: 0.2 } } }}
					className="space-y-6"
				>
					{/* Plan Card */}
					<motion.div variants={staggerItem} className="border border-foreground/[0.06] p-6 space-y-4 hover:border-foreground/[0.1] transition-colors duration-300">
						<div className="flex items-center justify-between">
							<h3 className="font-mono text-[10px] uppercase tracking-wider text-foreground/40">
								Team Plan
							</h3>
							<Link to="/portal/billing" className="font-mono text-[10px] uppercase tracking-wider text-foreground/40 hover:text-foreground transition-colors">
								Manage
							</Link>
						</div>
						<div>
							<p className="text-xl font-medium tracking-tight text-foreground">
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
								<div className="h-1 w-full bg-foreground/[0.06] overflow-hidden">
									<motion.div
										initial={{ width: 0 }}
										animate={{ width: `${Math.max(2, Math.min(100, (daysRemaining / 365) * 100))}%` }}
										transition={{ duration: 1, delay: 0.5, ease: "easeOut" }}
										className="h-full bg-primary/60"
									/>
								</div>
								<p className="font-mono text-[10px] text-foreground/40 text-center uppercase tracking-wider">
									{daysRemaining} days remaining
								</p>
							</div>
						)}
					</motion.div>

					{/* Roster Snapshot */}
					<motion.div variants={staggerItem} className="border border-foreground/[0.06] p-6 space-y-4 hover:border-foreground/[0.1] transition-colors duration-300">
						<div className="flex items-center justify-between">
							<h3 className="font-mono text-[10px] uppercase tracking-wider text-foreground/40">
								Roster
							</h3>
							<Link to="/portal/team" className="font-mono text-[10px] uppercase tracking-wider text-foreground/40 hover:text-foreground transition-colors">
								View all
							</Link>
						</div>
						{roster?.members && roster.members.length > 0 ? (
							<StaggerList className="space-y-2">
								{roster.members.slice(0, 5).map((m) => (
									<StaggerItem key={m.athleteId}>
										<div className="flex items-center gap-3 py-1.5 group/member">
											<div className="h-7 w-7 bg-foreground/10 flex items-center justify-center text-[10px] font-mono text-foreground/60 shrink-0 group-hover/member:bg-primary/10 group-hover/member:text-primary transition-colors duration-200">
												{m.name?.slice(0, 2).toUpperCase() || "?"}
											</div>
											<div className="min-w-0 flex-1">
												<p className="text-sm font-medium truncate">{m.name}</p>
												<p className="font-mono text-[10px] text-foreground/40 uppercase tracking-wider">
													Age {m.age}
												</p>
											</div>
										</div>
									</StaggerItem>
								))}
								{roster.members.length > 5 && (
									<Link
										to="/portal/team"
										className="block text-center font-mono text-[10px] uppercase tracking-wider text-foreground/40 hover:text-foreground pt-2 transition-colors"
									>
										+{roster.members.length - 5} more athletes
									</Link>
								)}
							</StaggerList>
						) : (
							<div className="py-6 text-center">
								<Users className="h-5 w-5 mx-auto mb-2 text-foreground/20" />
								<p className="text-sm text-muted-foreground">No athletes yet.</p>
								<Link to="/portal/team" className="block font-mono text-[10px] uppercase tracking-wider text-foreground/50 hover:text-foreground mt-2 transition-colors">
									Add athletes
								</Link>
							</div>
						)}
					</motion.div>

					{/* Coach Info */}
					<motion.div variants={staggerItem} className="border border-foreground/[0.06] p-6 space-y-3 hover:border-foreground/[0.1] transition-colors duration-300">
						<h3 className="font-mono text-[10px] uppercase tracking-wider text-foreground/40">
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
							className="block w-full text-center py-2 text-sm font-medium border border-foreground/[0.06] hover:bg-foreground/[0.02] hover:border-foreground/[0.12] transition-all duration-200 mt-2"
						>
							Edit Profile
						</Link>
					</motion.div>
				</motion.div>
			</div>
		</PageTransition>
	);
}

function StatCard({ label, value, sub, icon }: {
	label: string;
	value: string;
	sub: string;
	icon: React.ReactNode;
}) {
	return (
		<div className="p-5 space-y-3 group/stat hover:bg-foreground/[0.015] transition-colors duration-200">
			<div className="flex items-center justify-between">
				<p className="font-mono text-[10px] uppercase tracking-wider text-foreground/40">{label}</p>
				<div className="h-7 w-7 flex items-center justify-center text-foreground/40 group-hover/stat:text-primary transition-colors duration-200">
					{icon}
				</div>
			</div>
			<div>
				<motion.p
					key={value}
					initial={{ opacity: 0, y: 8 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.4 }}
					className="text-2xl font-medium tracking-tight"
				>
					{value}
				</motion.p>
				<p className="text-xs text-muted-foreground">{sub}</p>
			</div>
		</div>
	);
}

function QuickAction({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
	return (
		<Link
			to={to}
			className="flex flex-col items-center gap-2 p-4 border border-foreground/[0.06] hover:bg-foreground/[0.02] hover:border-foreground/[0.12] transition-all duration-200 group/action"
		>
			<motion.div
				whileHover={{ scale: 1.1 }}
				whileTap={{ scale: 0.95 }}
				className="h-9 w-9 flex items-center justify-center text-foreground/50 group-hover/action:text-primary transition-colors duration-200"
			>
				{icon}
			</motion.div>
			<p className="font-mono text-[10px] uppercase tracking-wider text-foreground/60 group-hover/action:text-foreground transition-colors duration-200">{label}</p>
		</Link>
	);
}

function BookingRow({ booking }: { booking: ScheduleEvent }) {
	const statusColors: Record<string, string> = {
		confirmed: "text-primary/70",
		pending: "text-foreground/40",
		declined: "text-destructive",
		cancelled: "text-muted-foreground",
	};
	return (
		<motion.div
			whileHover={{ x: 2 }}
			transition={{ duration: 0.15 }}
			className="flex items-center gap-4 p-3 border border-foreground/[0.06] hover:bg-foreground/[0.02] hover:border-foreground/[0.1] transition-all duration-200"
		>
			<div className="h-8 w-8 flex items-center justify-center text-foreground/40 shrink-0">
				<Calendar className="h-4 w-4" />
			</div>
			<div className="min-w-0 flex-1">
				<p className="text-sm font-medium truncate">{booking.title}</p>
				<p className="font-mono text-[10px] text-foreground/40 uppercase tracking-wider">
					{new Date(booking.startsAt).toLocaleDateString(undefined, {
						weekday: "short", month: "short", day: "numeric",
					})}{" "}
					· {booking.timeStart}
				</p>
			</div>
			{booking.status && (
				<span className={`font-mono text-[10px] uppercase tracking-wider ${statusColors[booking.status] ?? ""}`}>
					{booking.status}
				</span>
			)}
		</motion.div>
	);
}

/* ─── Athlete Dashboard ─── */

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
		<PageTransition className="max-w-6xl mx-auto p-4 md:p-6 pb-20 space-y-6">
			{homeError && (
				<motion.div
					initial={{ opacity: 0, height: 0 }}
					animate={{ opacity: 1, height: "auto" }}
					className="border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"
				>
					{homeError instanceof Error ? homeError.message : "Error loading dashboard"}
				</motion.div>
			)}

			{/* Hero */}
			<motion.div
				variants={fadeUp}
				initial="hidden"
				animate="visible"
				className="border border-foreground/[0.06] p-6 md:p-8 hover:border-foreground/[0.1] transition-colors duration-300"
			>
				{homeContent ? (
					<div className="max-w-2xl">
						<motion.h1
							initial={{ opacity: 0, x: -10 }}
							animate={{ opacity: 1, x: 0 }}
							transition={{ delay: 0.1, duration: 0.5 }}
							className="text-2xl md:text-3xl font-medium tracking-tight text-foreground mb-2"
						>
							{homeContent.headline || `Welcome back, ${displayName}`}
						</motion.h1>
						<motion.p
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							transition={{ delay: 0.25, duration: 0.5 }}
							className="text-sm text-muted-foreground leading-relaxed"
						>
							{homeContent.description || "Your daily performance overview."}
						</motion.p>
						{user.team?.name?.trim() && (
							<p className="mt-3 font-mono text-[10px] uppercase tracking-wider text-foreground/40">
								Club · <span className="text-foreground/60">{user.team.name.trim()}</span>
							</p>
						)}
						{homeContent.introVideoUrl && (
							<motion.a
								whileHover={{ scale: 1.02 }}
								whileTap={{ scale: 0.98 }}
								href={homeContent.introVideoUrl}
								target="_blank"
								rel="noopener noreferrer"
								className="inline-flex items-center gap-2 mt-6 px-5 py-2.5 bg-primary text-primary-foreground font-mono text-xs uppercase tracking-wider hover:opacity-90 transition-colors"
							>
								<TrendingUp className="h-4 w-4" />
								Watch Intro
							</motion.a>
						)}
					</div>
				) : (
					<div>
						<motion.h1
							initial={{ opacity: 0, x: -10 }}
							animate={{ opacity: 1, x: 0 }}
							transition={{ delay: 0.1 }}
							className="text-2xl md:text-3xl font-medium tracking-tight mb-2"
						>
							Welcome back, {displayName}
						</motion.h1>
						<p className="text-sm text-muted-foreground">
							{user.role && user.role !== "athlete" ? `Role: ${user.role}` : "Athlete dashboard"}
							{user.team?.name?.trim() && (
								<span className="mt-2 block font-mono text-[10px] uppercase tracking-wider text-foreground/40">Club: {user.team.name.trim()}</span>
							)}
						</p>
					</div>
				)}
			</motion.div>

			{/* Plan + Profile row */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
				<motion.div
					variants={scaleIn}
					initial="hidden"
					animate="visible"
					className="md:col-span-2 border border-foreground/[0.06] p-6 hover:border-foreground/[0.1] transition-colors duration-300"
				>
					<div className="flex items-center justify-between mb-4">
						<div>
							<h2 className="text-lg font-medium tracking-tight">{planCardTitle}</h2>
							<p className="text-sm text-foreground/60 font-medium">{planPrimaryLabel}</p>
							{planSecondary && <p className="text-sm text-muted-foreground mt-1">{planSecondary}</p>}
						</div>
						<div className="text-right">
							<p className="font-mono text-[10px] uppercase tracking-wider text-foreground/40">{memberSinceLabel}</p>
							<p className="text-sm font-medium">{formatDate(memberSinceDate)}</p>
						</div>
					</div>
					{planExpiresAt ? (
						<div className="pt-4 border-t border-foreground/[0.06]">
							<div className="flex justify-between items-center mb-2">
								<p className="text-sm text-muted-foreground">Time Remaining</p>
								<p className="text-sm font-medium text-foreground">
									{Math.ceil((new Date(planExpiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))} Days
								</p>
							</div>
							<div className="h-1 w-full bg-foreground/[0.06] overflow-hidden">
								<motion.div
									initial={{ width: 0 }}
									animate={{ width: `${Math.max(0, Math.min(100, ((new Date(planExpiresAt).getTime() - Date.now()) / (30 * 24 * 60 * 60 * 1000)) * 100))}%` }}
									transition={{ duration: 1, delay: 0.4, ease: "easeOut" }}
									className="h-full bg-primary/60"
								/>
							</div>
							<p className="mt-2 font-mono text-[10px] text-foreground/40 uppercase tracking-wider">Expires on {formatDate(planExpiresAt)}</p>
						</div>
					) : teamActiveWithoutExpiry ? (
						<div className="pt-4 border-t border-foreground/[0.06]">
							<p className="text-sm text-muted-foreground">
								Team billing is active{user.team?.name?.trim() ? ` for ${user.team.name.trim()}` : ""}. Renewal dates may not show here yet; you still have access through your club.
							</p>
						</div>
					) : (
						<div className="pt-4 border-t border-foreground/[0.06]">
							<p className="text-sm text-muted-foreground">
								{user.team?.name?.trim()
									? `No active subscription on record for ${user.team.name.trim()} or your personal plan.`
									: "No active subscription found. Explore our plans to get started."}
							</p>
						</div>
					)}
				</motion.div>

				<motion.div
					variants={scaleIn}
					initial="hidden"
					animate="visible"
					transition={{ delay: 0.1 }}
					className="border border-foreground/[0.06] p-6 flex flex-col justify-between hover:border-foreground/[0.1] transition-colors duration-300"
				>
					<div className="space-y-4">
						<h2 className="font-mono text-[10px] uppercase tracking-wider text-foreground/40">Profile Info</h2>
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
						className="block w-full mt-4 py-2 text-sm font-medium border border-foreground/[0.06] hover:bg-foreground/[0.02] hover:border-foreground/[0.12] transition-all duration-200 text-center"
					>
						Edit Profile
					</Link>
				</motion.div>
			</div>

			{/* Quick Actions */}
			<StaggerList className="grid grid-cols-2 md:grid-cols-3 gap-3">
				<StaggerItem><QuickAction to="/portal/programs" icon={<Dumbbell className="h-4 w-4" />} label="Programs" /></StaggerItem>
				<StaggerItem><QuickAction to="/portal/schedule" icon={<Calendar className="h-4 w-4" />} label="Schedule" /></StaggerItem>
				<StaggerItem><QuickAction to="/portal/messages" icon={<MessageSquare className="h-4 w-4" />} label="Messages" /></StaggerItem>
			</StaggerList>

			{/* Activity Feed */}
			<motion.div
				variants={fadeUp}
				initial="hidden"
				animate="visible"
				transition={{ delay: 0.35 }}
				className="space-y-4"
			>
				<div className="flex items-center justify-between px-1">
					<h2 className="font-mono text-xs uppercase tracking-wider text-foreground">Recent Activity</h2>
					<Link to="/portal/nutrition" className="font-mono text-[10px] uppercase tracking-wider text-foreground/40 hover:text-foreground transition-colors">
						Log today
					</Link>
				</div>
				{feedLoading ? (
					<div className="border border-foreground/[0.06] divide-y divide-foreground/[0.06]">
						{[1, 2, 3].map((i) => (
							<div key={i} className="flex items-start gap-4 px-5 py-4">
								<div className="h-7 w-7 bg-foreground/[0.06] animate-pulse shrink-0" />
								<div className="flex-1 space-y-2">
									<div className="h-3 w-48 bg-foreground/[0.06] animate-pulse" />
									<div className="h-2.5 w-32 bg-foreground/[0.04] animate-pulse" />
								</div>
								<div className="h-2.5 w-12 bg-foreground/[0.04] animate-pulse" />
							</div>
						))}
					</div>
				) : !feedData?.items?.length ? (
					<div className="border border-foreground/[0.06] p-8 text-center">
						<Activity className="h-6 w-6 mx-auto text-foreground/20 mb-3" />
						<p className="text-sm text-muted-foreground">
							No activity yet — start logging nutrition or complete a training session.
						</p>
					</div>
				) : (
					<StaggerList className="border border-foreground/[0.06] divide-y divide-foreground/[0.06]">
						{feedData.items.map((item: any) => (
							<StaggerItem key={item.id}>
								<motion.div
									whileHover={{ x: 2 }}
									transition={{ duration: 0.15 }}
									className="flex items-start gap-4 px-5 py-4 hover:bg-foreground/[0.015] transition-colors duration-200"
								>
									<div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center text-foreground/40">
										{item.icon === "utensils" ? <Utensils className="h-4 w-4" /> :
										 item.icon === "activity" ? <Activity className="h-4 w-4" /> :
										 item.icon === "credit-card" ? <CreditCard className="h-4 w-4" /> :
										 item.icon === "bell" ? <Bell className="h-4 w-4" /> :
										 <Dumbbell className="h-4 w-4" />}
									</div>
									<div className="min-w-0 flex-1">
										<p className="text-sm font-medium text-foreground leading-snug">{item.title}</p>
										{item.description && (
											<p className="text-xs text-muted-foreground mt-0.5 truncate">{item.description}</p>
										)}
									</div>
									<p className="shrink-0 font-mono text-[10px] text-foreground/40 uppercase tracking-wider">{formatRelativeDate(item.date)}</p>
								</motion.div>
							</StaggerItem>
						))}
					</StaggerList>
				)}
			</motion.div>

			{/* Testimonials */}
			{homeContent?.testimonials && homeContent.testimonials.length > 0 && (
				<motion.div
					variants={fadeUp}
					initial="hidden"
					animate="visible"
					transition={{ delay: 0.4 }}
					className="space-y-4"
				>
					<h2 className="font-mono text-xs uppercase tracking-wider text-foreground px-1">What Athletes Say</h2>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						{homeContent.testimonials.slice(0, 2).map((t: any) => (
							<motion.div
								key={t.id}
								whileHover={{ y: -2 }}
								transition={{ duration: 0.2 }}
								className="p-6 border border-foreground/[0.06] text-muted-foreground relative hover:border-foreground/[0.1] transition-colors duration-300"
							>
								<span className="text-3xl absolute top-4 left-4 text-foreground/10">"</span>
								<p className="relative z-10 mb-4 text-sm italic leading-relaxed">{t.quote}</p>
								<div className="flex items-center gap-3">
									{t.photoUrl && <img src={t.photoUrl} alt="" className="w-7 h-7 object-cover" />}
									<div>
										<p className="text-sm font-medium text-foreground not-italic">{t.name}</p>
										{t.role && <p className="font-mono text-[10px] uppercase tracking-wider text-foreground/40 not-italic">{t.role}</p>}
									</div>
								</div>
							</motion.div>
						))}
					</div>
				</motion.div>
			)}
		</PageTransition>
	);
}
