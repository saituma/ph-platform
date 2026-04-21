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
import { usePortal } from "@/portal/PortalContext";
import { fetchBookings } from "@/services/scheduleService";
import { useQuery } from "@tanstack/react-query";

export const scheduleKeys = {
	all: ["schedule"] as const,
	bookings: (token: string | null) =>
		[...scheduleKeys.all, "bookings", token] as const,
};

export const Route = createFileRoute("/portal/schedule")({
	loader: async ({ context: { queryClient } }) => {
		const token = localStorage.getItem("auth_token");
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
	const { token, loading: portalLoading, error: portalError } = usePortal();

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

	const upcomingEvents = events.filter(
		(e) => new Date(e.startsAt) >= new Date(new Date().setHours(0, 0, 0, 0)),
	);

	return (
		<div className="container mx-auto p-4 pb-20 space-y-8">
			{error && (
				<div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
					{error}
				</div>
			)}

			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-black italic uppercase tracking-tight">
						Your <span className="text-primary">Schedule</span>
					</h1>
					<p className="text-muted-foreground font-medium mt-1">
						Manage your training and bookings
					</p>
				</div>
				<button
					type="button"
					onClick={() => setIsBookingOpen(true)}
					className="p-3 bg-primary text-primary-foreground rounded-2xl shadow-xl shadow-primary/20 hover:scale-105 transition-all"
				>
					<Plus className="w-6 h-6" />
				</button>
			</div>

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
												{event.status === "confirmed" && (
													<span className="px-2 py-0.5 bg-green-500/10 text-green-500 rounded-full text-[10px] font-black uppercase">
														Confirmed
													</span>
												)}
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
											<button
												type="button"
												onClick={() => setIsBookingOpen(true)}
												className="px-4 py-2 text-xs font-bold border rounded-xl hover:bg-muted transition-colors"
											>
												Reschedule
											</button>
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
									<button
										type="button"
										onClick={() => setIsBookingOpen(true)}
										className="mt-4 text-primary font-bold hover:underline"
									>
										Book a session
									</button>
								</div>
							)}
						</div>
					</section>
				</div>

				<div className="space-y-6">
					<div className="p-8 rounded-[2.5rem] border bg-card shadow-sm space-y-6">
						<h3 className="font-bold uppercase italic text-sm tracking-widest text-muted-foreground">
							Calendar Preview
						</h3>
						<div className="aspect-square bg-muted/20 rounded-3xl flex items-center justify-center border border-dashed">
							<p className="text-xs text-muted-foreground text-center px-6 leading-relaxed">
								Interactive calendar view is coming soon to web. Use the list
								view to manage your current sessions.
							</p>
						</div>
					</div>

					<div className="p-8 rounded-[2.5rem] border bg-primary/5 border-primary/20 space-y-4">
						<h3 className="font-bold text-primary italic uppercase tracking-tight">
							Need a session?
						</h3>
						<p className="text-sm text-muted-foreground leading-relaxed">
							Book discovery calls, assessments, or specialized training
							directly with your coaches.
						</p>
						<button
							type="button"
							onClick={() => setIsBookingOpen(true)}
							className="w-full py-4 bg-primary text-primary-foreground rounded-2xl font-black uppercase italic tracking-wider text-sm shadow-xl shadow-primary/20 hover:scale-[1.02] transition-all"
						>
							Browse Services
						</button>
					</div>
				</div>
			</div>

			<BookingModal
				isOpen={isBookingOpen}
				onClose={() => setIsBookingOpen(false)}
				token={token}
				onSuccess={refetch}
			/>
		</div>
	);
}
