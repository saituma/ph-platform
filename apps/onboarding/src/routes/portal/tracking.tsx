import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { env } from "@/env";
import { usePortal } from "@/portal/PortalContext";

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

type TrackingData = {
	runs: Run[];
	leaderboard: unknown[];
	adults: unknown[];
};

export const Route = createFileRoute("/portal/tracking")({
	component: TrackingPage,
});

function TrackingPage() {
	const [data, setData] = useState<TrackingData | null>(null);
	const [loading, setLoading] = useState(true);
	const { token, loading: portalLoading } = usePortal();

	useEffect(() => {
		if (portalLoading || !token) return;

		const fetchTrackingData = async () => {
			try {
				const baseUrl = env.VITE_PUBLIC_API_URL || "http://localhost:3000";

				// Fetch user's social feed data (works for all roles)
				const response = await fetch(`${baseUrl}/api/social/my-runs`, {
					headers: { Authorization: `Bearer ${token}` },
				});

				if (response.status === 403) {
					throw new Error("Access restricted: Social features are only for adult athletes.");
				}

				const result = await response.json();
				const runs = Array.isArray(result.items) ? (result.items as Run[]) : [];
				setData({
					runs,
					leaderboard: [],
					adults: [],
				});
			} catch (error) {
				console.error("Failed to fetch tracking data:", error);
			} finally {
				setLoading(false);
			}
		};

		fetchTrackingData();
	}, [token, portalLoading]);

	if (portalLoading || loading) {
		return (
			<div className="flex h-screen items-center justify-center">
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
		<div className="container mx-auto p-4 pb-20">
			<h1 className="text-2xl font-bold mb-4">Community Tracking</h1>

			{data?.runs?.length === 0 ? (
				<div className="text-center py-8">
					<p className="text-muted-foreground">No public runs found</p>
				</div>
			) : (
				<div className="space-y-4">
					{data?.runs?.slice(0, 5).map((run) => {
						const km = run.distanceMeters
							? `${(run.distanceMeters / 1000).toFixed(2)} km`
							: "N/A";
						const time = run.durationSeconds
							? `${Math.floor(run.durationSeconds / 60)}m ${run.durationSeconds % 60}s`
							: "N/A";
						const pace = run.avgPace ? `${run.avgPace.toFixed(2)}/km` : "N/A";

						return (
							<div key={run.runLogId} className="p-4 border rounded-lg">
								<div className="flex flex-col gap-2">
									<div className="flex justify-between items-center">
										<span className="font-medium">
											{run.name || "Untitled Run"}
										</span>
										<span className="text-sm text-muted-foreground">
											{new Date(run.date).toLocaleDateString()}
										</span>
									</div>

									<div className="text-sm text-muted-foreground">
										{km} · {time} · {pace}
									</div>

									<div className="flex gap-2 mt-2">
										<button
											type="button"
											className="text-sm px-3 py-1 border rounded-lg"
										>
											Comments ({run.commentCount || 0})
										</button>
										<button
											type="button"
											className="text-sm px-3 py-1 border rounded-lg"
										>
											Like ({run.likeCount || 0})
										</button>
										<button
											type="button"
											className="text-sm px-3 py-1 border rounded-lg"
										>
											Share
										</button>
									</div>
								</div>
							</div>
						);
					})}
				</div>
			)}
		</div>
	);
}
