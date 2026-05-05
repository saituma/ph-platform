import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
	Activity,
	Calendar,
	ChevronRight,
	Clock,
	Heart,
	MapPin,
	Phone,
	Plus,
	Video,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { BookingModal } from "@/components/portal/BookingModal";
import { getTokenStatus } from "@/lib/client-storage";
import { getPublicApiBaseUrl } from "@/lib/public-api";
import { isPortalTeamRosterManagerRole } from "@/lib/portal-roles";
import {
	motion,
	PageTransition,
	StaggerList,
	StaggerItem,
	Skeleton,
} from "@/lib/motion";
import { usePortal } from "@/portal/PortalContext";
import { portalUserMaySelfBookSchedule } from "@/lib/portal-schedule-access";
import { createAdminCustomSession, fetchAdminNonTeamUsers, fetchBookings } from "@/services/scheduleService";

export const scheduleKeys = {
	all: ["schedule"] as const,
	bookings: (token: string | null) =>
		[...scheduleKeys.all, "bookings", token] as const,
};

export const Route = createFileRoute("/portal/schedule")({
	loader: async ({ context: { queryClient } }) => {
		const status = await getTokenStatus();
		if (status.authenticated) {
			await queryClient.ensureQueryData({
				queryKey: scheduleKeys.bookings("cookie"),
				queryFn: () => fetchBookings(),
			});
		}
	},
	component: SchedulePage,
});

function ScheduleSkeleton() {
	return (
		<div className="container mx-auto p-4 pb-20 space-y-8">
			<div className="flex items-center justify-between">
				<div className="space-y-2">
					<Skeleton className="h-8 w-64" />
					<Skeleton className="h-4 w-48" />
				</div>
				<Skeleton className="h-12 w-12" />
			</div>
			<div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
				<div className="lg:col-span-2 space-y-6">
					<Skeleton className="h-5 w-48" />
					{[1, 2, 3].map((i) => (
						<div key={i} className="p-6 rounded-[2rem] border space-y-3">
							<div className="flex items-center gap-6">
								<Skeleton className="w-14 h-14 rounded-2xl" />
								<div className="flex-1 space-y-2">
									<Skeleton className="h-5 w-40" />
									<Skeleton className="h-4 w-60" />
									<Skeleton className="h-3 w-32" />
								</div>
							</div>
						</div>
					))}
				</div>
				<div>
					<div className="p-8 rounded-[2.5rem] border space-y-4">
						<Skeleton className="h-5 w-32" />
						<Skeleton className="h-4 w-full" />
						<Skeleton className="h-4 w-3/4" />
						<Skeleton className="h-12 w-full rounded-2xl" />
					</div>
				</div>
			</div>
		</div>
	);
}

function SchedulePage() {
	const [isBookingOpen, setIsBookingOpen] = useState(false);
	const [adminMode, setAdminMode] = useState<null | "one_to_one" | "small_group">(null);
	const [candidateQuery, setCandidateQuery] = useState("");
	const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
	const [customStartsAt, setCustomStartsAt] = useState("");
	const [customEndsAt, setCustomEndsAt] = useState("");
	const [customLocation, setCustomLocation] = useState("");
	const [customMeetingLink, setCustomMeetingLink] = useState("");
	const [customNotes, setCustomNotes] = useState("");
	const [customGroupName, setCustomGroupName] = useState("");
	const [customBookable, setCustomBookable] = useState(true);
	const [customSaving, setCustomSaving] = useState(false);
	const [adminFeedback, setAdminFeedback] = useState<string | null>(null);
	const { token, user, loading: portalLoading, error: portalError } = usePortal();
	const canSelfBook = portalUserMaySelfBookSchedule(user);
	const canManageSchedule = isPortalTeamRosterManagerRole(user?.role);

	const {
		data: events = [],
		isLoading,
		error,
		refetch,
	} = useQuery({
		queryKey: scheduleKeys.bookings(token),
		queryFn: () => fetchBookings(token!),
		enabled: !!token && !portalLoading,
		staleTime: 1000 * 60 * 5,
	});

	const {
		data: scheduleCandidates = [],
		isLoading: scheduleCandidatesLoading,
		refetch: refetchCandidates,
	} = useQuery({
		queryKey: ["schedule", "admin-candidates", candidateQuery.trim().toLowerCase()],
		queryFn: () => fetchAdminNonTeamUsers({ q: candidateQuery.trim(), limit: 120 }),
		enabled: canManageSchedule && !!token && !portalLoading && adminMode !== null,
		staleTime: 1000 * 30,
	});

	useEffect(() => {
		if (!token) return;
		const rawSocket = String(
			(import.meta.env as Record<string, string | undefined>)
				.VITE_PUBLIC_SOCKET_URL ?? "",
		).trim();
		const apiBase = getPublicApiBaseUrl();
		const socketUrl = rawSocket
			? rawSocket.replace(/\/api\/?$/, "")
			: apiBase
				? apiBase.replace(/\/api\/?$/, "")
				: window.location.origin;
		const socket: Socket = io(socketUrl, {
			path: "/socket.io",
			auth: { token },
			transports: ["polling", "websocket"],
			reconnection: true,
			reconnectionDelayMax: 10000,
		});

		const onScheduleChanged = () => {
			void refetch();
		};
		socket.on("schedule:changed", onScheduleChanged);
		return () => {
			socket.off("schedule:changed", onScheduleChanged);
			socket.disconnect();
		};
	}, [token, refetch]);

	const candidateList = useMemo(() => {
		const q = candidateQuery.trim().toLowerCase();
		if (!q) return scheduleCandidates;
		return scheduleCandidates.filter((item) => {
			return (
				item.name?.toLowerCase().includes(q) ||
				item.email?.toLowerCase().includes(q)
			);
		});
	}, [scheduleCandidates, candidateQuery]);

	const togglePickUser = (userId: number) => {
		setSelectedUserIds((prev) => {
			const has = prev.includes(userId);
			if (has) return prev.filter((id) => id !== userId);
			if (adminMode === "one_to_one") return [userId];
			return [...prev, userId];
		});
	};

	const resetAdminForm = () => {
		setSelectedUserIds([]);
		setCustomStartsAt("");
		setCustomEndsAt("");
		setCustomLocation("");
		setCustomMeetingLink("");
		setCustomNotes("");
		setCustomGroupName("");
		setCustomBookable(true);
		setAdminFeedback(null);
	};

	const submitCustomSchedule = async () => {
		if (!adminMode) return;
		if (selectedUserIds.length === 0) {
			setAdminFeedback("Pick at least one user.");
			return;
		}
		if (adminMode === "one_to_one" && selectedUserIds.length !== 1) {
			setAdminFeedback("1:1 schedule needs exactly one user.");
			return;
		}
		if (!customStartsAt || !customEndsAt) {
			setAdminFeedback("Start and end time are required.");
			return;
		}
		const startIso = new Date(customStartsAt).toISOString();
		const endIso = new Date(customEndsAt).toISOString();
		if (new Date(startIso).getTime() >= new Date(endIso).getTime()) {
			setAdminFeedback("End time must be after start time.");
			return;
		}

		setCustomSaving(true);
		setAdminFeedback(null);
		try {
			const result = await createAdminCustomSession({
				mode: adminMode,
				userIds: selectedUserIds,
				startsAt: startIso,
				endsAt: endIso,
				isBookable: customBookable,
				location: customLocation.trim() || null,
				meetingLink: customMeetingLink.trim() || null,
				notes: customNotes.trim() || null,
				groupName: customGroupName.trim() || null,
			});
			await refetch();
			if (result.failedCount > 0) {
				setAdminFeedback(
					`Created ${result.createdCount}. Failed ${result.failedCount}. First error: ${result.failures[0]?.reason ?? "Unknown"}`,
				);
			} else {
				setAdminFeedback(`Created ${result.createdCount} session booking(s).`);
			}
			resetAdminForm();
			setAdminMode(null);
		} catch (e: any) {
			setAdminFeedback(e?.message ?? "Failed to create session");
		} finally {
			setCustomSaving(false);
		}
	};

	const getEventIcon = (type: string) => {
		switch (type) {
			case "call":
				return <Phone className="w-5 h-5" />;
			case "recovery":
				return <Heart className="w-5 h-5" />;
			default:
				return <Activity className="w-5 h-5" />;
		}
	};

	const getStatusBadge = (status?: string) => {
		switch (status) {
			case "confirmed":
				return (
					<span className="px-2 py-0.5 bg-green-500/10 text-green-500 rounded-full text-[10px] font-black uppercase">
						Confirmed
					</span>
				);
			case "pending":
				return (
					<span className="px-2 py-0.5 bg-amber-500/10 text-amber-500 rounded-full text-[10px] font-black uppercase">
						Pending
					</span>
				);
			case "declined":
				return (
					<span className="px-2 py-0.5 bg-destructive/10 text-destructive rounded-full text-[10px] font-black uppercase">
						Declined
					</span>
				);
			case "cancelled":
				return (
					<span className="px-2 py-0.5 bg-muted text-muted-foreground rounded-full text-[10px] font-black uppercase">
						Cancelled
					</span>
				);
			default:
				return null;
		}
	};

	const getEventColor = (type: string) => {
		switch (type) {
			case "call":
				return "bg-blue-500/10 text-blue-500 border-blue-500/20";
			case "recovery":
				return "bg-pink-500/10 text-pink-500 border-pink-500/20";
			default:
				return "bg-primary/10 text-primary border-primary/20";
		}
	};

	if (portalLoading || (token && isLoading && !events.length)) {
		return <ScheduleSkeleton />;
	}

	if (portalError) {
		return (
			<PageTransition>
				<div className="flex h-screen items-center justify-center pb-20 px-4">
					<div className="text-center">
						<p className="text-muted-foreground mb-4">{portalError}</p>
						<Link to="/login" className="text-primary font-bold hover:underline">
							Go to Login
						</Link>
					</div>
				</div>
			</PageTransition>
		);
	}

	const today = new Date(new Date().setHours(0, 0, 0, 0));
	const futureEvents = events.filter((e) => new Date(e.startsAt) >= today);
	const requestedEvents = futureEvents.filter((e) => e.status === "pending");
	const upcomingEvents = futureEvents.filter((e) => e.status !== "pending");
	const pastEvents = events
		.filter((e) => new Date(e.startsAt) < today)
		.sort((a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime());

	return (
		<PageTransition className="container mx-auto p-4 pb-20 space-y-8">
			{error ? (
				<motion.div
					initial={{ opacity: 0, height: 0 }}
					animate={{ opacity: 1, height: "auto" }}
					className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"
				>
					{error instanceof Error ? error.message : String(error)}
				</motion.div>
			) : null}

			<motion.div
				initial={{ opacity: 0, y: -10 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.4 }}
				className="flex items-center justify-between"
			>
				<div>
					<h1 className="text-3xl font-black italic uppercase tracking-tight">
						Your <span className="text-primary">Schedule</span>
					</h1>
					<p className="text-muted-foreground font-medium mt-1">
						{canSelfBook
							? "Manage your training and bookings"
							: "Sessions your coach books for you appear here."}
					</p>
				</div>
				{canSelfBook ? (
					<motion.button
						whileHover={{ scale: 1.05 }}
						whileTap={{ scale: 0.95 }}
						type="button"
						onClick={() => setIsBookingOpen(true)}
						className="p-3 bg-primary text-primary-foreground rounded-2xl shadow-xl shadow-primary/20"
					>
						<Plus className="w-6 h-6" />
					</motion.button>
				) : null}
			</motion.div>

			{canManageSchedule ? (
				<div className="rounded-2xl border bg-card p-4 space-y-4">
					<div className="flex flex-wrap gap-2">
						<button
							type="button"
							onClick={() => {
								setAdminMode("one_to_one");
								setSelectedUserIds([]);
								setAdminFeedback(null);
							}}
							className="px-3 py-2 rounded-xl border text-sm font-semibold hover:bg-muted"
						>
							1-1 Schedule
						</button>
						<button
							type="button"
							onClick={() => {
								setAdminMode("small_group");
								setSelectedUserIds([]);
								setAdminFeedback(null);
							}}
							className="px-3 py-2 rounded-xl border text-sm font-semibold hover:bg-muted"
						>
							Small Group Session
						</button>
						{adminMode ? (
							<button
								type="button"
								onClick={() => {
									setAdminMode(null);
									resetAdminForm();
								}}
								className="px-3 py-2 rounded-xl border text-sm hover:bg-muted ml-auto"
							>
								Close
							</button>
						) : null}
					</div>

					{adminMode ? (
						<div className="space-y-3">
							<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
								<label className="text-sm">
									<div className="font-medium mb-1">Start</div>
									<input
										type="datetime-local"
										value={customStartsAt}
										onChange={(e) => setCustomStartsAt(e.target.value)}
										className="w-full h-10 rounded-lg border px-3 bg-background"
									/>
								</label>
								<label className="text-sm">
									<div className="font-medium mb-1">End</div>
									<input
										type="datetime-local"
										value={customEndsAt}
										onChange={(e) => setCustomEndsAt(e.target.value)}
										className="w-full h-10 rounded-lg border px-3 bg-background"
									/>
								</label>
							</div>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
								<label className="text-sm">
									<div className="font-medium mb-1">Location</div>
									<input
										type="text"
										value={customLocation}
										onChange={(e) => setCustomLocation(e.target.value)}
										className="w-full h-10 rounded-lg border px-3 bg-background"
										placeholder="Gym / field / clinic"
									/>
								</label>
								<label className="text-sm">
									<div className="font-medium mb-1">Meeting Link</div>
									<input
										type="url"
										value={customMeetingLink}
										onChange={(e) => setCustomMeetingLink(e.target.value)}
										className="w-full h-10 rounded-lg border px-3 bg-background"
										placeholder="https://..."
									/>
								</label>
							</div>
							{adminMode === "small_group" ? (
								<label className="text-sm block">
									<div className="font-medium mb-1">Group Name</div>
									<input
										type="text"
										value={customGroupName}
										onChange={(e) => setCustomGroupName(e.target.value)}
										className="w-full h-10 rounded-lg border px-3 bg-background"
										placeholder="Morning speed group"
									/>
								</label>
							) : null}
							<label className="text-sm block">
								<div className="font-medium mb-1">Notes</div>
								<textarea
									value={customNotes}
									onChange={(e) => setCustomNotes(e.target.value)}
									className="w-full min-h-[84px] rounded-lg border px-3 py-2 bg-background"
									placeholder="Optional coach/admin notes"
								/>
							</label>
							<label className="inline-flex items-center gap-2 text-sm">
								<input
									type="checkbox"
									checked={customBookable}
									onChange={(e) => setCustomBookable(e.target.checked)}
								/>
								Bookable session
							</label>

							<div className="space-y-2">
								<div className="flex items-center gap-2">
									<input
										type="text"
										value={candidateQuery}
										onChange={(e) => setCandidateQuery(e.target.value)}
										placeholder="Search non-team users"
										className="h-10 rounded-lg border px-3 bg-background flex-1"
									/>
									<button
										type="button"
										onClick={() => void refetchCandidates()}
										className="h-10 px-3 rounded-lg border text-sm"
									>
										Refresh
									</button>
								</div>
								<div className="max-h-56 overflow-auto border rounded-lg divide-y">
									{scheduleCandidatesLoading ? (
										<div className="p-3 text-sm text-muted-foreground">Loading users...</div>
									) : candidateList.length === 0 ? (
										<div className="p-3 text-sm text-muted-foreground">No non-team users found.</div>
									) : (
										candidateList.map((item) => {
											const checked = selectedUserIds.includes(item.userId);
											return (
												<label
													key={item.userId}
													className="flex items-center gap-3 p-2.5 text-sm cursor-pointer hover:bg-muted/50"
												>
													<input
														type="checkbox"
														checked={checked}
														onChange={() => togglePickUser(item.userId)}
													/>
													<div>
														<div className="font-medium">{item.name}</div>
														<div className="text-xs text-muted-foreground">{item.email}</div>
													</div>
												</label>
											);
										})
									)}
								</div>
								<div className="text-xs text-muted-foreground">
									Selected users: {selectedUserIds.length}
								</div>
							</div>

							<div className="flex items-center gap-2">
								<button
									type="button"
									onClick={() => void submitCustomSchedule()}
									disabled={customSaving}
									className="px-4 h-10 rounded-lg bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-60"
								>
									{customSaving ? "Creating..." : "Create Schedule"}
								</button>
								{adminFeedback ? (
									<span className="text-xs text-muted-foreground">{adminFeedback}</span>
								) : null}
							</div>
						</div>
					) : null}
				</div>
			) : null}

			{!canSelfBook ? (
				<motion.div
					initial={{ opacity: 0, y: 8 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.1 }}
					className="rounded-2xl border border-primary/20 bg-primary/5 p-4 text-sm text-muted-foreground"
				>
					<p className="font-medium text-foreground">Coach-managed schedule</p>
					<p className="mt-1 leading-relaxed">
						You cannot book sessions from this account. When your coach schedules a session for you, it will
						show up under Upcoming Bookings.
					</p>
				</motion.div>
			) : null}

			<div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
				<div className="lg:col-span-2 space-y-6">
					<section className="space-y-4">
						<motion.h2
							initial={{ opacity: 0, x: -10 }}
							animate={{ opacity: 1, x: 0 }}
							transition={{ delay: 0.15 }}
							className="text-xl font-bold border-l-4 border-primary pl-3"
						>
							Upcoming Bookings
						</motion.h2>

						<StaggerList className="space-y-4">
							{upcomingEvents.length > 0 ? (
								upcomingEvents.map((event) => (
									<StaggerItem key={event.id}>
										<motion.div
											whileHover={{ y: -2, borderColor: "rgba(138, 255, 0, 0.3)" }}
											transition={{ duration: 0.2 }}
											className="group p-6 rounded-[2rem] border bg-card transition-shadow hover:shadow-lg flex flex-col md:flex-row md:items-center gap-6"
										>
											<motion.div
												whileHover={{ rotate: 5, scale: 1.05 }}
												className={`w-14 h-14 rounded-2xl border flex items-center justify-center shrink-0 ${getEventColor(event.type)}`}
											>
												{getEventIcon(event.type)}
											</motion.div>

											<div className="flex-1 space-y-1">
												<div className="flex items-center gap-2">
													<h3 className="font-bold text-lg uppercase italic tracking-tight">
														{event.title}
													</h3>
													{getStatusBadge(event.status)}
												</div>

												<div className="flex flex-wrap gap-4 text-sm text-muted-foreground font-medium">
													<div className="flex items-center gap-1.5">
														<Calendar className="w-4 h-4 text-primary/60" />
														{new Date(event.startsAt).toLocaleDateString(
															undefined,
															{
																weekday: "short",
																month: "short",
																day: "numeric",
															},
														)}
													</div>
													<div className="flex items-center gap-1.5">
														<Clock className="w-4 h-4 text-primary/60" />
														{event.timeStart} - {event.timeEnd}
													</div>
												</div>

												<div className="flex items-center gap-4 pt-2">
													<div className="flex items-center gap-1.5 text-xs text-muted-foreground">
														<MapPin className="w-3.5 h-3.5 text-primary/40" />
														{event.location}
													</div>
													{event.meetingLink && (
														<a
															href={event.meetingLink}
															target="_blank"
															rel="noreferrer"
															className="flex items-center gap-1.5 text-xs text-primary font-bold hover:underline"
														>
															<Video className="w-3.5 h-3.5" />
															Join Call
														</a>
													)}
												</div>
											</div>

											<div className="flex items-center gap-2">
												{canSelfBook ? (
													<motion.button
														whileHover={{ scale: 1.03 }}
														whileTap={{ scale: 0.97 }}
														type="button"
														onClick={() => setIsBookingOpen(true)}
														className="px-4 py-2 text-xs font-bold border rounded-xl hover:bg-muted transition-colors"
													>
														Reschedule
													</motion.button>
												) : null}
												<div className="p-2 text-muted-foreground/30 group-hover:text-primary/40 transition-colors">
													<ChevronRight className="w-5 h-5" />
												</div>
											</div>
										</motion.div>
									</StaggerItem>
								))
							) : (
								<StaggerItem>
									<motion.div
										initial={{ opacity: 0 }}
										animate={{ opacity: 1 }}
										className="py-20 text-center border-2 border-dashed rounded-[3rem] bg-muted/5"
									>
										<p className="text-muted-foreground font-medium italic">
											No upcoming bookings found.
										</p>
										{canSelfBook ? (
											<button
												type="button"
												onClick={() => setIsBookingOpen(true)}
												className="mt-4 text-primary font-bold hover:underline"
											>
												Book a session
											</button>
										) : (
											<p className="mt-4 text-sm text-muted-foreground">
												Your coach will add bookings when they are ready.
											</p>
										)}
									</motion.div>
								</StaggerItem>
							)}
						</StaggerList>
					</section>

					{requestedEvents.length > 0 && (
						<motion.section
							initial={{ opacity: 0, y: 12 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ delay: 0.2 }}
							className="space-y-4"
						>
							<h2 className="text-xl font-bold border-l-4 border-amber-500 pl-3">
								Requested Bookings
							</h2>
							<StaggerList className="space-y-4">
								{requestedEvents.map((event) => (
									<StaggerItem key={event.id}>
										<div className="group p-6 rounded-[2rem] border border-amber-500/20 bg-amber-500/5 flex flex-col md:flex-row md:items-center gap-6">
											<div
												className={`w-14 h-14 rounded-2xl border flex items-center justify-center shrink-0 ${getEventColor(event.type)}`}
											>
												{getEventIcon(event.type)}
											</div>
											<div className="flex-1 space-y-1">
												<div className="flex items-center gap-2">
													<h3 className="font-bold text-lg uppercase italic tracking-tight">
														{event.title}
													</h3>
													{getStatusBadge(event.status)}
												</div>
												<div className="flex flex-wrap gap-4 text-sm text-muted-foreground font-medium">
													<div className="flex items-center gap-1.5">
														<Calendar className="w-4 h-4 text-primary/60" />
														{new Date(event.startsAt).toLocaleDateString(undefined, {
															weekday: "short", month: "short", day: "numeric",
														})}
													</div>
													<div className="flex items-center gap-1.5">
														<Clock className="w-4 h-4 text-primary/60" />
														{event.timeStart} - {event.timeEnd}
													</div>
												</div>
												{event.notes && (
													<p className="text-xs text-muted-foreground mt-1 italic">{event.notes}</p>
												)}
											</div>
										</div>
									</StaggerItem>
								))}
							</StaggerList>
						</motion.section>
					)}

					{pastEvents.length > 0 && (
						<motion.section
							initial={{ opacity: 0, y: 12 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ delay: 0.3 }}
							className="space-y-4"
						>
							<h2 className="text-xl font-bold border-l-4 border-muted-foreground/30 pl-3">
								Past Bookings
							</h2>
							<StaggerList className="space-y-3">
								{pastEvents.map((event) => (
									<StaggerItem key={event.id}>
										<div className="p-5 rounded-2xl border bg-card/50 flex flex-col md:flex-row md:items-center gap-4 opacity-70 hover:opacity-90 transition-opacity duration-200">
											<div
												className={`w-12 h-12 rounded-xl border flex items-center justify-center shrink-0 ${getEventColor(event.type)}`}
											>
												{getEventIcon(event.type)}
											</div>
											<div className="flex-1 space-y-0.5">
												<div className="flex items-center gap-2">
													<h3 className="font-bold uppercase italic tracking-tight">
														{event.title}
													</h3>
													{getStatusBadge(event.status)}
												</div>
												<div className="flex flex-wrap gap-4 text-sm text-muted-foreground font-medium">
													<div className="flex items-center gap-1.5">
														<Calendar className="w-4 h-4 text-muted-foreground/40" />
														{new Date(event.startsAt).toLocaleDateString(undefined, {
															weekday: "short", month: "short", day: "numeric", year: "numeric",
														})}
													</div>
													<div className="flex items-center gap-1.5">
														<Clock className="w-4 h-4 text-muted-foreground/40" />
														{event.timeStart} - {event.timeEnd}
													</div>
												</div>
											</div>
										</div>
									</StaggerItem>
								))}
							</StaggerList>
						</motion.section>
					)}
				</div>

				<motion.div
					initial={{ opacity: 0, x: 20 }}
					animate={{ opacity: 1, x: 0 }}
					transition={{ delay: 0.2, duration: 0.4 }}
					className="space-y-6"
				>
					<div className="p-8 rounded-[2.5rem] border bg-primary/5 border-primary/20 space-y-4">
						<h3 className="font-bold text-primary italic uppercase tracking-tight">
							{canSelfBook ? "Need a session?" : "Team schedule"}
						</h3>
						<p className="text-sm text-muted-foreground leading-relaxed">
							{canSelfBook
								? "Book discovery calls, assessments, or specialized training directly with your coaches."
								: "Ask your coach if you need an extra session. They manage bookings for roster athletes."}
						</p>
						{canSelfBook ? (
							<motion.button
								whileHover={{ scale: 1.02 }}
								whileTap={{ scale: 0.98 }}
								type="button"
								onClick={() => setIsBookingOpen(true)}
								className="w-full py-4 bg-primary text-primary-foreground rounded-2xl font-black uppercase italic tracking-wider text-sm shadow-xl shadow-primary/20"
							>
								Browse Services
							</motion.button>
						) : null}
					</div>
				</motion.div>
			</div>

			{canSelfBook ? (
				<BookingModal
					isOpen={isBookingOpen}
					onClose={() => setIsBookingOpen(false)}
					token={token}
					onSuccess={refetch}
				/>
			) : null}
		</PageTransition>
	);
}
