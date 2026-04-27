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
import { useState } from "react";
import { BookingModal } from "@/components/portal/BookingModal";
import { getClientAuthToken } from "@/lib/client-storage";
import { usePortal } from "@/portal/PortalContext";
import { portalUserMaySelfBookSchedule } from "@/lib/portal-schedule-access";
import { fetchBookings } from "@/services/scheduleService";

export const scheduleKeys = {
	all: ["schedule"] as const,
	bookings: (token: string | null) =>
		[...scheduleKeys.all, "bookings", token] as const,
};

export const Route = createFileRoute("/portal/schedule")({
	loader: async ({ context: { queryClient } }) => {
		const token = getClientAuthToken();
		if (token) {
			await queryClient.ensureQueryData({
				queryKey: scheduleKeys.bookings(token),
				queryFn: () => fetchBookings(token),
			});
		}
	},
	component: SchedulePage,
});

function SchedulePage() {
	const [isBookingOpen, setIsBookingOpen] = useState(false);
	const { token, user, loading: portalLoading, error: portalError } = usePortal();
	const canSelfBook = portalUserMaySelfBookSchedule(user);

	const {
		data: events = [],
		isLoading,
		error,
		refetch,
	} = useQuery({
		queryKey: scheduleKeys.bookings(token),
		queryFn: () => fetchBookings(token!),
		enabled: !!token && !portalLoading,
		staleTime: 1000 * 60 * 5, // 5 minutes
	});

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
		return (
			<div className="flex h-screen items-center justify-center pb-20">
				<div className="text-center">
					<div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
					<p className="mt-4 text-sm text-muted-foreground">
						Syncing your schedule...
					</p>
				</div>
			</div>
		);
	}

	if (portalError) {
		return (
			<div className="flex h-screen items-center justify-center pb-20 px-4">
				<div className="text-center">
					<p className="text-muted-foreground mb-4">{portalError}</p>
					<Link to="/login" className="text-primary font-bold hover:underline">
						Go to Login
					</Link>
				</div>
			</div>
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
		<div className="container mx-auto p-4 pb-20 space-y-8">
			{error ? (
				<div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
					{error instanceof Error ? error.message : String(error)}
				</div>
			) : null}

			<div className="flex items-center justify-between">
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
					<button
						type="button"
						onClick={() => setIsBookingOpen(true)}
						className="p-3 bg-primary text-primary-foreground rounded-2xl shadow-xl shadow-primary/20 hover:scale-105 transition-all"
					>
						<Plus className="w-6 h-6" />
					</button>
				) : null}
			</div>

			{!canSelfBook ? (
				<div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 text-sm text-muted-foreground">
					<p className="font-medium text-foreground">Coach-managed schedule</p>
					<p className="mt-1 leading-relaxed">
						You cannot book sessions from this account. When your coach schedules a session for you, it will
						show up under Upcoming Bookings.
					</p>
				</div>
			) : null}

			<div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
				<div className="lg:col-span-2 space-y-6">
					<section className="space-y-4">
						<h2 className="text-xl font-bold border-l-4 border-primary pl-3">
							Upcoming Bookings
						</h2>

						<div className="space-y-4">
							{upcomingEvents.length > 0 ? (
								upcomingEvents.map((event) => (
									<div
										key={event.id}
										className="group p-6 rounded-[2rem] border bg-card hover:border-primary/50 transition-all hover:shadow-lg flex flex-col md:flex-row md:items-center gap-6"
									>
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
												<button
													type="button"
													onClick={() => setIsBookingOpen(true)}
													className="px-4 py-2 text-xs font-bold border rounded-xl hover:bg-muted transition-colors"
												>
													Reschedule
												</button>
											) : null}
											<div className="p-2 text-muted-foreground/30">
												<ChevronRight className="w-5 h-5" />
											</div>
										</div>
									</div>
								))
							) : (
								<div className="py-20 text-center border-2 border-dashed rounded-[3rem] bg-muted/5">
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
								</div>
							)}
						</div>
					</section>

					{requestedEvents.length > 0 && (
						<section className="space-y-4">
							<h2 className="text-xl font-bold border-l-4 border-amber-500 pl-3">
								Requested Bookings
							</h2>
							<div className="space-y-4">
								{requestedEvents.map((event) => (
									<div
										key={event.id}
										className="group p-6 rounded-[2rem] border border-amber-500/20 bg-amber-500/5 flex flex-col md:flex-row md:items-center gap-6"
									>
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
								))}
							</div>
						</section>
					)}

					{pastEvents.length > 0 && (
						<section className="space-y-4">
							<h2 className="text-xl font-bold border-l-4 border-muted-foreground/30 pl-3">
								Past Bookings
							</h2>
							<div className="space-y-3">
								{pastEvents.map((event) => (
									<div
										key={event.id}
										className="p-5 rounded-2xl border bg-card/50 flex flex-col md:flex-row md:items-center gap-4 opacity-70"
									>
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
								))}
							</div>
						</section>
					)}
				</div>

				<div className="space-y-6">
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
							<button
								type="button"
								onClick={() => setIsBookingOpen(true)}
								className="w-full py-4 bg-primary text-primary-foreground rounded-2xl font-black uppercase italic tracking-wider text-sm shadow-xl shadow-primary/20 hover:scale-[1.02] transition-all"
							>
								Browse Services
							</button>
						) : null}
					</div>
				</div>
			</div>

			{canSelfBook ? (
				<BookingModal
					isOpen={isBookingOpen}
					onClose={() => setIsBookingOpen(false)}
					token={token}
					onSuccess={refetch}
				/>
			) : null}
		</div>
	);
}
