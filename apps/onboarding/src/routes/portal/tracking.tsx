import { createFileRoute } from "@tanstack/react-router";
import { env } from "@/env";
import { usePortal } from "@/portal/PortalContext";
import { useQuery } from "@tanstack/react-query";
import { Activity, Clock, MapPin, MessageSquare, Share2, ThumbsUp } from "lucide-react";

type Run = {
	runLogId: string | number;
	name?: string | null;
	date: string;
	distanceMeters?: number | null;
	durationSeconds?: number | null;
	avgPace?: number | null;
	commentCount?: number | null;
	likeCount?: number | null;
};

export const trackingKeys = {
	all: ["tracking"] as const,
	runs: (token: string | null) => [...trackingKeys.all, "runs", token] as const,
};

async function fetchMyRuns(token: string) {
	const baseUrl = env.VITE_PUBLIC_API_URL || "http://localhost:3000";
	const response = await fetch(`${baseUrl}/api/social/my-runs`, {
		headers: { Authorization: `Bearer ${token}` },
	});

	if (response.status === 403) {
		throw new Error("Access restricted: Social features are only for adult athletes.");
	}

	if (!response.ok) {
		throw new Error("Failed to fetch tracking data");
	}

	const result = await response.json();
	return (Array.isArray(result.items) ? (result.items as Run[]) : []) as Run[];
}

export const Route = createFileRoute("/portal/tracking")({
	loader: async ({ context: { queryClient } }) => {
		const token = localStorage.getItem("auth_token");
		if (token) {
			await queryClient.ensureQueryData({
				queryKey: trackingKeys.runs(token),
				queryFn: () => fetchMyRuns(token),
			});
		}
	},
	component: TrackingPage,
});

function TrackingPage() {
	const { token, loading: portalLoading } = usePortal();

	const {
		data: runs = [],
		isLoading,
		error,
	} = useQuery({
		queryKey: trackingKeys.runs(token),
		queryFn: () => fetchMyRuns(token!),
		enabled: !!token && !portalLoading,
		staleTime: 1000 * 60 * 5,
	});

	if (portalLoading || (token && isLoading && !runs.length)) {
		return (
			<div className="flex h-screen items-center justify-center pb-20">
				<div className="text-center">
					<div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
					<p className="mt-4 text-sm text-muted-foreground">
						Loading tracking data...
					</p>
				</div>
			</div>
		);
	}

	return (
		<div className="container mx-auto p-4 pb-20 space-y-8">
			<div>
				<h1 className="text-3xl font-black italic uppercase tracking-tight">
					Performance <span className="text-primary">Tracking</span>
				</h1>
				<p className="text-muted-foreground font-medium mt-1">
					Monitor your sessions and community progress
				</p>
			</div>

			{error ? (
				<div className="p-12 text-center border-2 border-dashed rounded-[3rem] bg-muted/5">
					<p className="text-muted-foreground font-medium italic">
						{error instanceof Error ? error.message : "Social features unavailable."}
					</p>
				</div>
			) : runs.length === 0 ? (
				<div className="p-12 text-center border-2 border-dashed rounded-[3rem] bg-muted/5">
					<p className="text-muted-foreground font-medium italic">
						No tracking data found yet. Start your first session to see progress.
					</p>
				</div>
			) : (
				<div className="space-y-6">
					<h2 className="text-xl font-bold border-l-4 border-primary pl-3">
						Recent Activity
					</h2>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
						{runs.map((run) => {
							const km = run.distanceMeters
								? `${(run.distanceMeters / 1000).toFixed(2)} km`
								: "N/A";
							const time = run.durationSeconds
								? `${Math.floor(run.durationSeconds / 60)}m ${run.durationSeconds % 60}s`
								: "N/A";
							const pace = run.avgPace ? `${run.avgPace.toFixed(2)}/km` : "N/A";

							return (
								<div key={run.runLogId} className="group p-6 rounded-[2rem] border bg-card hover:border-primary/50 transition-all hover:shadow-lg space-y-6">
									<div className="flex justify-between items-start">
										<div className="flex items-center gap-4">
											<div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary border border-primary/20">
												<Activity size={24} weight="fill" />
											</div>
											<div>
												<h3 className="font-bold text-lg uppercase italic tracking-tight">
													{run.name || "Untitled Run"}
												</h3>
												<p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
													{new Date(run.date).toLocaleDateString(undefined, {
														weekday: "short",
														month: "short",
														day: "numeric",
													})}
												</p>
											</div>
										</div>
									</div>

									<div className="grid grid-cols-3 gap-4">
										<div className="space-y-1">
											<p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Distance</p>
											<p className="font-black italic text-primary">{km}</p>
										</div>
										<div className="space-y-1">
											<p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Time</p>
											<p className="font-black italic text-primary">{time}</p>
										</div>
										<div className="space-y-1">
											<p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Pace</p>
											<p className="font-black italic text-primary">{pace}</p>
										</div>
									</div>

									<div className="flex gap-2 pt-2">
										<button
											type="button"
											className="flex items-center gap-2 px-4 py-2 bg-muted/20 border border-transparent rounded-xl text-xs font-bold hover:border-primary/30 transition-all"
										>
											<MessageSquare size={14} />
											{run.commentCount || 0}
										</button>
										<button
											type="button"
											className="flex items-center gap-2 px-4 py-2 bg-muted/20 border border-transparent rounded-xl text-xs font-bold hover:border-primary/30 transition-all"
										>
											<ThumbsUp size={14} />
											{run.likeCount || 0}
										</button>
										<button
											type="button"
											className="flex items-center gap-2 px-4 py-2 bg-muted/20 border border-transparent rounded-xl text-xs font-bold hover:border-primary/30 transition-all ml-auto"
										>
											<Share2 size={14} />
										</button>
									</div>
								</div>
							);
						})}
					</div>
				</div>
			)}
		</div>
	);
}
