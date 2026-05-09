import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
	Activity,
	ArrowRight,
	Bell,
	Calendar,
	CheckCircle2,
	Clock,
	CreditCard,
	Dumbbell,
	ExternalLink,
	FlaskConical,
	Megaphone,
	MessageSquare,
	Shield,
	UserPlus,
	Users,
	Utensils,
	Video,
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
import { fetchInbox } from "@/services/messagesService";
import { fetchMyAssignedPrograms } from "@/services/programsService";
import { fetchBookings, fetchScheduledPrograms, type ScheduleEvent } from "@/services/scheduleService";
import { settingsService } from "@/services/settingsService";
import { fetchTeamRoster } from "@/services/teamRosterService";
import { StoriesRow } from "@/components/StoriesRow";
import { BetaTesterForm } from "@/components/BetaTesterForm";

export const homeKeys = homeQueryKeys;

/* ─── Video Utilities ─── */

type VideoSource =
	| { kind: "youtube"; embedUrl: string }
	| { kind: "loom"; embedUrl: string }
	| { kind: "html5"; videoUrl: string }
	| { kind: "unknown"; url: string };

const EMPTY_VTT_CAPTIONS = "data:text/vtt,WEBVTT%0A%0A";

function toYouTubeEmbedUrl(videoId: string) {
	const id = videoId.trim();
	return `https://www.youtube.com/embed/${encodeURIComponent(id)}?rel=0&modestbranding=1`;
}

function toLoomEmbedUrl(videoId: string) {
	const id = videoId.trim();
	return `https://www.loom.com/embed/${encodeURIComponent(id)}`;
}

function safeParseUrl(raw: string): URL | null {
	const base =
		typeof window !== "undefined" ? window.location.origin : "http://localhost";
	try {
		return new URL(raw, base);
	} catch {
		try {
			return new URL(`https://${raw}`);
		} catch {
			return null;
		}
	}
}

function normalizeVideoSource(rawUrl: string): VideoSource {
	const url = rawUrl.trim();
	if (!url) return { kind: "unknown", url: rawUrl };

	if (!url.startsWith("http") && /^[a-zA-Z0-9_-]{11}$/.test(url)) {
		return { kind: "youtube", embedUrl: toYouTubeEmbedUrl(url) };
	}

	if (url.startsWith("blob:") || url.startsWith("data:")) {
		return { kind: "html5", videoUrl: url };
	}

	if (/\.(mp4|webm|ogg|mov|m4v)(\?|#|$)/i.test(url)) {
		return { kind: "html5", videoUrl: url };
	}

	const parsed = safeParseUrl(url);
	if (!parsed) return { kind: "unknown", url };

	const host = parsed.hostname.replace(/^www\./, "");
	const path = parsed.pathname;

	if (host === "youtu.be") {
		const id = path.split("/").filter(Boolean)[0] ?? "";
		if (id) return { kind: "youtube", embedUrl: toYouTubeEmbedUrl(id) };
	}

	if (host.endsWith("youtube.com")) {
		const v = parsed.searchParams.get("v");
		if (v) return { kind: "youtube", embedUrl: toYouTubeEmbedUrl(v) };
		const embedMatch = path.match(/^\/embed\/([^/]+)/);
		if (embedMatch?.[1])
			return { kind: "youtube", embedUrl: toYouTubeEmbedUrl(embedMatch[1]) };
		const shortsMatch = path.match(/^\/shorts\/([^/]+)/);
		if (shortsMatch?.[1])
			return { kind: "youtube", embedUrl: toYouTubeEmbedUrl(shortsMatch[1]) };
	}

	if (host === "loom.com") {
		const shareMatch = path.match(/^\/share\/([^/]+)/);
		const embedMatch = path.match(/^\/embed\/([^/]+)/);
		const id = shareMatch?.[1] ?? embedMatch?.[1] ?? "";
		if (id) return { kind: "loom", embedUrl: toLoomEmbedUrl(id) };
	}

	if (/\.(mp4|webm|ogg|mov|m4v)(\?|#|$)/i.test(parsed.pathname)) {
		return { kind: "html5", videoUrl: parsed.toString() };
	}

	return { kind: "unknown", url: parsed.toString() };
}

function VideoPlayer({ videoUrl }: { videoUrl: string }) {
	const source = normalizeVideoSource(videoUrl);

	if (source.kind === "youtube" || source.kind === "loom") {
		return (
			<iframe
				src={source.embedUrl}
				className="w-full h-full"
				allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
				allowFullScreen
				referrerPolicy="strict-origin-when-cross-origin"
				title="Intro video"
			/>
		);
	}

	if (source.kind === "html5") {
		return (
			<video className="w-full h-full" controls playsInline preload="metadata">
				<source src={source.videoUrl} />
				<track
					kind="captions"
					src={EMPTY_VTT_CAPTIONS}
					srcLang="en"
					label="Captions"
				/>
				Your browser does not support the video tag.
			</video>
		);
	}

	return (
		<div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground gap-3 p-6">
			<Video className="w-12 h-12 opacity-20" />
			<p className="text-sm font-medium text-center">
				Video link can’t be embedded. Open it in a new tab.
			</p>
			<a
				href={source.url}
				target="_blank"
				rel="noreferrer"
				className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-primary hover:underline"
			>
				Open video <ExternalLink className="w-4 h-4" />
			</a>
		</div>
	);
}

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

			<StoriesRow />

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

function QuickAction({ to, icon, label, badge }: { to: string; icon: React.ReactNode; label: string; badge?: number }) {
	return (
		<Link
			to={to}
			className="relative flex flex-col items-center gap-2 p-4 border border-foreground/[0.06] hover:bg-foreground/[0.02] hover:border-foreground/[0.12] transition-all duration-200 group/action"
		>
			{badge != null && badge > 0 && (
				<motion.span
					initial={{ scale: 0 }}
					animate={{ scale: 1 }}
					transition={{ type: "spring", stiffness: 300, damping: 15 }}
					className="absolute top-2 right-2 h-4 min-w-4 px-1 flex items-center justify-center bg-primary text-primary-foreground font-mono text-[9px] font-bold"
				>
					{badge > 99 ? "99+" : badge}
				</motion.span>
			)}
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
	const { data: bookings = [] } = useQuery({
		queryKey: ["schedule", "bookings", token],
		queryFn: () => fetchBookings(token!),
		enabled: !!token,
		staleTime: 1000 * 60 * 5,
	});

	const { data: scheduledPrograms = [] } = useQuery({
		queryKey: ["schedule", "programs"],
		queryFn: () => fetchScheduledPrograms(),
		enabled: !!token,
		staleTime: 1000 * 60 * 5,
	});

	const { data: inboxData } = useQuery({
		queryKey: ["inbox", token],
		queryFn: () => fetchInbox(token!),
		enabled: !!token,
		staleTime: 1000 * 60 * 2,
	});

	const { data: assignedPrograms } = useQuery({
		queryKey: ["assignedPrograms", token],
		queryFn: () => fetchMyAssignedPrograms(token!),
		enabled: !!token,
		staleTime: 1000 * 60 * 5,
	});

	const { data: announcementsData } = useQuery({
		queryKey: ["announcements"],
		queryFn: () => settingsService.getAnnouncements(),
		enabled: !!token,
		staleTime: 1000 * 60 * 5,
	});

	const { data: notificationsData } = useQuery({
		queryKey: ["notifications"],
		queryFn: () => settingsService.getNotifications(),
		enabled: !!token,
		staleTime: 1000 * 60 * 2,
	});

	const upcomingBookings = bookings
		.filter((b) => new Date(b.startsAt) >= new Date() && b.status !== "cancelled")
		.sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())
		.slice(0, 3);

	const upcomingScheduled = scheduledPrograms
		.filter((s) => new Date(s.startsAt) >= new Date())
		.sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())
		.slice(0, 3);

	const allUpcoming = [...upcomingBookings, ...upcomingScheduled]
		.sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())
		.slice(0, 4);

	const unreadThreads = (inboxData?.threads ?? []).filter((t) => t.unread > 0);
	const totalUnread = unreadThreads.reduce((sum, t) => sum + t.unread, 0);

	const announcements = (announcementsData?.items ?? []).slice(0, 2);
	const unreadNotifications = (notificationsData?.items ?? []).filter((n) => !n.read).slice(0, 5);

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
					<div className="space-y-8">
						<div className="flex flex-col md:flex-row gap-8 items-start">
							{homeContent.professionalPhoto && (
								<motion.div
									initial={{ opacity: 0, y: 10 }}
									animate={{ opacity: 1, y: 0 }}
									transition={{ duration: 0.6 }}
									className="shrink-0"
								>
									<div className="max-w-full overflow-hidden border border-foreground/[0.06] bg-foreground/5">
										<img
											src={homeContent.professionalPhoto}
											alt=""
											className="h-auto max-h-[400px] md:max-h-[500px] w-auto max-w-full object-contain"
											onError={(e) => (e.currentTarget.style.display = "none")}
										/>
									</div>
								</motion.div>
							)}

							<div className="flex-1 space-y-6">
								<div className="space-y-2">
									<motion.h1
										initial={{ opacity: 0, x: -10 }}
										animate={{ opacity: 1, x: 0 }}
										transition={{ delay: 0.1, duration: 0.5 }}
										className="text-2xl md:text-3xl font-medium tracking-tight text-foreground"
									>
										{homeContent.headline && 
										 !homeContent.headline.startsWith("http") && 
										 !/\.(jpg|jpeg|png|webp|gif|svg)$/i.test(homeContent.headline)
											? homeContent.headline 
											: `Welcome back, ${displayName}`}
									</motion.h1>
									<motion.p
										initial={{ opacity: 0 }}
										animate={{ opacity: 1 }}
										transition={{ delay: 0.25, duration: 0.5 }}
										className="text-sm text-muted-foreground leading-relaxed"
									>
										{homeContent.description && 
										 !homeContent.description.startsWith("http") && 
										 !/\.(jpg|jpeg|png|webp|gif|svg)$/i.test(homeContent.description)
											? homeContent.description
											: "Your daily performance overview."}
									</motion.p>
								</div>

								<div className="pt-6 border-t border-foreground/[0.06] space-y-4 max-w-sm">
									<h2 className="font-mono text-[10px] uppercase tracking-wider text-foreground/40">Profile Info</h2>
									<div className="space-y-2.5">
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
									<Link
										to="/portal/profile"
										className="inline-block mt-2 py-2 px-6 text-sm font-medium border border-foreground/[0.06] hover:bg-foreground/[0.02] hover:border-foreground/[0.12] transition-all duration-200 text-center"
									>
										Edit Profile
									</Link>
								</div>
							</div>
						</div>

						<div className="flex flex-wrap items-center gap-4">
							{user.team?.name?.trim() && (
								<p className="font-mono text-[10px] uppercase tracking-wider text-foreground/40">
									Club · <span className="text-foreground/60">{user.team.name.trim()}</span>
								</p>
							)}
						</div>

						{homeContent.introVideoUrl && (
							<div className="pt-8 border-t border-foreground/[0.06]">
								<h2 className="font-mono text-[10px] uppercase tracking-wider text-foreground/40 mb-4">Intro Video</h2>
								<div className="aspect-video w-full max-w-3xl overflow-hidden border border-foreground/[0.06] bg-black shadow-2xl">
									<VideoPlayer videoUrl={homeContent.introVideoUrl} />
								</div>
							</div>
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

			<StoriesRow />

			<BetaTesterForm userEmail={user.email} userName={user.athleteName || user.name || undefined} />

			{/* Plan row */}
			<div className="grid grid-cols-1 gap-6">
				<motion.div
					variants={scaleIn}
					initial="hidden"
					animate="visible"
					className="border border-foreground/[0.06] p-6 hover:border-foreground/[0.1] transition-colors duration-300"
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
			</div>

			{/* Quick Actions */}
			<StaggerList className="grid grid-cols-2 md:grid-cols-4 gap-3">
				<StaggerItem><QuickAction to="/portal/programs" icon={<Dumbbell className="h-4 w-4" />} label="Programs" /></StaggerItem>
				<StaggerItem><QuickAction to="/portal/schedule" icon={<Calendar className="h-4 w-4" />} label="Schedule" /></StaggerItem>
				<StaggerItem><QuickAction to="/portal/messages" icon={<MessageSquare className="h-4 w-4" />} label="Messages" badge={totalUnread || undefined} /></StaggerItem>
				<StaggerItem><QuickAction to="/portal/nutrition" icon={<Utensils className="h-4 w-4" />} label="Nutrition" /></StaggerItem>
			</StaggerList>

			{/* Announcements Banner */}
			{announcements.length > 0 && (
				<motion.div
					variants={fadeUp}
					initial="hidden"
					animate="visible"
					transition={{ delay: 0.2 }}
					className="space-y-3"
				>
					{announcements.map((a: any) => (
						<motion.div
							key={a.id}
							whileHover={{ x: 2 }}
							transition={{ duration: 0.15 }}
							className="flex items-start gap-4 p-5 border border-primary/10 bg-primary/[0.02] hover:border-primary/20 transition-colors duration-200"
						>
							<div className="mt-0.5 h-8 w-8 flex items-center justify-center bg-primary/10 shrink-0">
								<Megaphone className="h-4 w-4 text-primary" />
							</div>
							<div className="min-w-0 flex-1">
								<p className="text-sm font-medium text-foreground">{a.title || "Announcement"}</p>
								<p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{a.content || a.message || a.body}</p>
								{a.createdAt && (
									<p className="font-mono text-[10px] text-foreground/30 uppercase tracking-wider mt-2">
										{formatRelativeDate(a.createdAt)}
									</p>
								)}
							</div>
						</motion.div>
					))}
				</motion.div>
			)}

			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
				<div className="lg:col-span-2 space-y-6">
					{/* Upcoming Schedule */}
					<motion.section
						variants={fadeUp}
						initial="hidden"
						animate="visible"
						transition={{ delay: 0.25 }}
						className="border border-foreground/[0.06] p-6 space-y-4"
					>
						<div className="flex items-center justify-between">
							<h2 className="font-mono text-xs uppercase tracking-wider text-foreground">Upcoming Schedule</h2>
							<Link to="/portal/schedule" className="font-mono text-[10px] uppercase tracking-wider text-foreground/40 hover:text-foreground transition-colors inline-flex items-center gap-1">
								View all <ArrowRight className="h-3 w-3" />
							</Link>
						</div>
						{allUpcoming.length > 0 ? (
							<StaggerList className="space-y-2">
								{allUpcoming.map((b) => (
									<StaggerItem key={b.id}><BookingRow booking={b} /></StaggerItem>
								))}
							</StaggerList>
						) : (
							<div className="py-8 text-center">
								<Calendar className="h-6 w-6 mx-auto mb-2 text-foreground/20" />
								<p className="text-sm text-muted-foreground">No upcoming sessions.</p>
								<Link to="/portal/schedule" className="inline-block font-mono text-[10px] uppercase tracking-wider text-foreground/40 hover:text-foreground mt-2 transition-colors">
									Book a session
								</Link>
							</div>
						)}
					</motion.section>

					{/* Assigned Programs */}
					{assignedPrograms && assignedPrograms.length > 0 && (
						<motion.section
							variants={fadeUp}
							initial="hidden"
							animate="visible"
							transition={{ delay: 0.3 }}
							className="border border-foreground/[0.06] p-6 space-y-4"
						>
							<div className="flex items-center justify-between">
								<h2 className="font-mono text-xs uppercase tracking-wider text-foreground">My Programs</h2>
								<Link to="/portal/programs" className="font-mono text-[10px] uppercase tracking-wider text-foreground/40 hover:text-foreground transition-colors inline-flex items-center gap-1">
									View all <ArrowRight className="h-3 w-3" />
								</Link>
							</div>
							<StaggerList className="grid grid-cols-1 sm:grid-cols-2 gap-3">
								{assignedPrograms.slice(0, 4).map((p: any) => (
									<StaggerItem key={p.id || p.programId}>
										<Link
											to="/portal/programs/assigned/$programId"
											params={{ programId: String(p.programId ?? p.id) }}
											className="block"
										>
											<motion.div
												whileHover={{ y: -2 }}
												transition={{ duration: 0.2 }}
												className="border border-foreground/[0.06] p-4 hover:border-foreground/[0.12] hover:bg-foreground/[0.015] transition-all duration-200 group/program"
											>
												<div className="flex items-start gap-3">
													<div className="h-9 w-9 bg-foreground/[0.06] flex items-center justify-center shrink-0 group-hover/program:bg-primary/10 transition-colors duration-200">
														<Dumbbell className="h-4 w-4 text-foreground/40 group-hover/program:text-primary transition-colors duration-200" />
													</div>
													<div className="min-w-0 flex-1">
														<p className="text-sm font-medium truncate">{p.name || p.programName || "Program"}</p>
														{p.sessionsCompleted != null && p.totalSessions != null && (
															<div className="mt-2 space-y-1">
																<div className="flex justify-between text-[10px] font-mono uppercase tracking-wider text-foreground/40">
																	<span>Progress</span>
																	<span>{p.sessionsCompleted}/{p.totalSessions}</span>
																</div>
																<div className="h-1 w-full bg-foreground/[0.06] overflow-hidden">
																	<motion.div
																		initial={{ width: 0 }}
																		animate={{ width: `${p.totalSessions > 0 ? (p.sessionsCompleted / p.totalSessions) * 100 : 0}%` }}
																		transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
																		className="h-full bg-primary/60"
																	/>
																</div>
															</div>
														)}
													</div>
												</div>
											</motion.div>
										</Link>
									</StaggerItem>
								))}
							</StaggerList>
						</motion.section>
					)}
				</div>

				{/* Right Sidebar */}
				<motion.div
					initial="hidden"
					animate="visible"
					variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.1, delayChildren: 0.3 } } }}
					className="space-y-6"
				>
					{/* Unread Messages */}
					<motion.div variants={staggerItem} className="border border-foreground/[0.06] p-6 space-y-4 hover:border-foreground/[0.1] transition-colors duration-300">
						<div className="flex items-center justify-between">
							<h3 className="font-mono text-[10px] uppercase tracking-wider text-foreground/40">Messages</h3>
							{totalUnread > 0 && (
								<motion.span
									initial={{ scale: 0 }}
									animate={{ scale: 1 }}
									transition={{ type: "spring", stiffness: 300, damping: 15 }}
									className="h-5 min-w-5 px-1.5 flex items-center justify-center bg-primary text-primary-foreground font-mono text-[10px] font-bold"
								>
									{totalUnread}
								</motion.span>
							)}
						</div>
						{unreadThreads.length > 0 ? (
							<StaggerList className="space-y-2">
								{unreadThreads.slice(0, 4).map((thread) => (
									<StaggerItem key={thread.id}>
										<Link to="/portal/messages" className="block">
											<motion.div
												whileHover={{ x: 2 }}
												transition={{ duration: 0.15 }}
												className="flex items-center gap-3 py-2 group/thread hover:bg-foreground/[0.015] px-2 -mx-2 transition-colors duration-200"
											>
												<div className="h-7 w-7 bg-foreground/10 flex items-center justify-center text-[10px] font-mono text-foreground/60 shrink-0 group-hover/thread:bg-primary/10 group-hover/thread:text-primary transition-colors duration-200">
													{thread.name?.slice(0, 2).toUpperCase() || "?"}
												</div>
												<div className="min-w-0 flex-1">
													<p className="text-sm font-medium truncate">{thread.name}</p>
													<p className="text-xs text-muted-foreground truncate">{thread.preview}</p>
												</div>
												{thread.unread > 0 && (
													<span className="h-4 min-w-4 px-1 flex items-center justify-center bg-primary/10 text-primary font-mono text-[9px] font-bold shrink-0">
														{thread.unread}
													</span>
												)}
											</motion.div>
										</Link>
									</StaggerItem>
								))}
							</StaggerList>
						) : (
							<div className="py-4 text-center">
								<MessageSquare className="h-5 w-5 mx-auto mb-2 text-foreground/20" />
								<p className="text-xs text-muted-foreground">All caught up</p>
							</div>
						)}
						<Link
							to="/portal/messages"
							className="block w-full text-center py-2 text-sm font-medium border border-foreground/[0.06] hover:bg-foreground/[0.02] hover:border-foreground/[0.12] transition-all duration-200"
						>
							Open Messages
						</Link>
					</motion.div>

					{/* Notifications */}
					<motion.div variants={staggerItem} className="border border-foreground/[0.06] p-6 space-y-4 hover:border-foreground/[0.1] transition-colors duration-300">
						<div className="flex items-center justify-between">
							<h3 className="font-mono text-[10px] uppercase tracking-wider text-foreground/40">Notifications</h3>
							{unreadNotifications.length > 0 && (
								<motion.div
									animate={{ scale: [1, 1.3, 1] }}
									transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
									className="h-1.5 w-1.5 rounded-full bg-primary"
								/>
							)}
						</div>
						{unreadNotifications.length > 0 ? (
							<StaggerList className="space-y-2">
								{unreadNotifications.map((n) => (
									<StaggerItem key={n.id}>
										<motion.div
											whileHover={{ x: 2 }}
											transition={{ duration: 0.15 }}
											className="flex items-start gap-3 py-2 hover:bg-foreground/[0.015] px-2 -mx-2 transition-colors duration-200"
										>
											<div className="mt-0.5 h-5 w-5 flex items-center justify-center text-foreground/30 shrink-0">
												<Bell className="h-3.5 w-3.5" />
											</div>
											<div className="min-w-0 flex-1">
												<p className="text-xs text-foreground leading-relaxed">{n.content}</p>
												<p className="font-mono text-[10px] text-foreground/30 uppercase tracking-wider mt-1">
													{formatRelativeDate(n.createdAt)}
												</p>
											</div>
										</motion.div>
									</StaggerItem>
								))}
							</StaggerList>
						) : (
							<div className="py-4 text-center">
								<Bell className="h-5 w-5 mx-auto mb-2 text-foreground/20" />
								<p className="text-xs text-muted-foreground">No new notifications</p>
							</div>
						)}
						<Link
							to="/portal/notifications"
							className="block font-mono text-[10px] uppercase tracking-wider text-foreground/40 hover:text-foreground text-center transition-colors"
						>
							View all notifications
						</Link>
					</motion.div>

					{/* Quick Stats */}
					<motion.div variants={staggerItem} className="border border-foreground/[0.06] p-6 space-y-4 hover:border-foreground/[0.1] transition-colors duration-300">
						<h3 className="font-mono text-[10px] uppercase tracking-wider text-foreground/40">At a Glance</h3>
						<div className="space-y-3">
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-2 text-sm text-muted-foreground">
									<Dumbbell className="h-3.5 w-3.5" />
									<span>Programs</span>
								</div>
								<span className="text-sm font-medium">{assignedPrograms?.length ?? 0}</span>
							</div>
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-2 text-sm text-muted-foreground">
									<Calendar className="h-3.5 w-3.5" />
									<span>Upcoming</span>
								</div>
								<span className="text-sm font-medium">{allUpcoming.length}</span>
							</div>
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-2 text-sm text-muted-foreground">
									<MessageSquare className="h-3.5 w-3.5" />
									<span>Unread</span>
								</div>
								<span className="text-sm font-medium">{totalUnread}</span>
							</div>
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-2 text-sm text-muted-foreground">
									<Bell className="h-3.5 w-3.5" />
									<span>Alerts</span>
								</div>
								<span className="text-sm font-medium">{unreadNotifications.length}</span>
							</div>
						</div>
					</motion.div>
				</motion.div>
			</div>

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
						{homeContent.testimonials.slice(0, 2).map((t: any) => {
							const testimonialPhoto =
								(typeof t?.photoUrl === "string" && t.photoUrl.trim()) ||
								(typeof t?.photo === "string" && t.photo.trim()) ||
								(typeof t?.imageUrl === "string" && t.imageUrl.trim()) ||
								(typeof t?.image === "string" && t.image.trim()) ||
								null;
							return (
							<motion.div
								key={t.id}
								whileHover={{ y: -2 }}
								transition={{ duration: 0.2 }}
								className="p-6 border border-foreground/[0.06] text-muted-foreground relative hover:border-foreground/[0.1] transition-colors duration-300"
							>
								<span className="text-3xl absolute top-4 left-4 text-foreground/10">"</span>
								<p className="relative z-10 mb-4 text-sm italic leading-relaxed">{t.quote}</p>
								<div className="flex items-center gap-3">
									{testimonialPhoto && <img src={testimonialPhoto} alt="" className="w-7 h-7 object-cover" />}
									<div>
										<p className="text-sm font-medium text-foreground not-italic">{t.name}</p>
										{t.role && <p className="font-mono text-[10px] uppercase tracking-wider text-foreground/40 not-italic">{t.role}</p>}
									</div>
								</div>
							</motion.div>
							);
						})}
					</div>
				</motion.div>
			)}
		</PageTransition>
	);
}
