import { useQuery } from "@tanstack/react-query";
import { Calendar, Footprints, Loader2, Timer } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { fetchRuns, formatDuration, formatPace } from "@/services/trackingService";

export function RunHistory() {
	const { data, isLoading } = useQuery({
		queryKey: ["runs", "history"],
		queryFn: () => fetchRuns(),
	});

	if (isLoading) {
		return (
			<div className="flex items-center justify-center py-8">
				<Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
			</div>
		);
	}

	const runs = data?.runs ?? [];

	if (runs.length === 0) {
		return (
			<Card className="mt-4 border-2 border-dashed">
				<CardContent className="py-10 text-center space-y-1">
					<Footprints className="h-8 w-8 text-muted-foreground/30 mx-auto" />
					<p className="text-sm font-medium text-muted-foreground">No runs yet</p>
					<p className="text-xs text-muted-foreground/60">Start your first run above!</p>
				</CardContent>
			</Card>
		);
	}

	return (
		<div className="mt-4 space-y-2">
			{runs.slice(0, 20).map((run) => (
				<Card key={run.clientId} className="border">
					<CardContent className="p-3 flex items-center justify-between">
						<div className="flex items-center gap-3">
							<div className="rounded-lg bg-primary/10 p-2 text-primary">
								<Footprints className="h-4 w-4" />
							</div>
							<div>
								<p className="text-sm font-bold">{(run.distanceMeters / 1000).toFixed(2)} km</p>
								<div className="flex items-center gap-2 text-[10px] text-muted-foreground">
									<span className="flex items-center gap-0.5">
										<Timer className="h-2.5 w-2.5" />
										{formatDuration(run.durationSeconds)}
									</span>
									{run.avgPace && (
										<span>{formatPace(run.avgPace)} /km</span>
									)}
								</div>
							</div>
						</div>
						<div className="flex items-center gap-1 text-[10px] text-muted-foreground">
							<Calendar className="h-3 w-3" />
							{new Date(run.date).toLocaleDateString()}
						</div>
					</CardContent>
				</Card>
			))}
		</div>
	);
}
