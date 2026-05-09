import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, BookOpen, Activity, Calendar, Target } from "lucide-react";
import { format } from "date-fns";
import { api } from "#/lib/api-client";
import { queryKeys } from "#/lib/query-keys";
import { cn } from "#/lib/utils";

export const Route = createFileRoute("/_app/children/$athleteId")({
	component: ChildDetailPage,
});

type Program = {
	id: string;
	name: string;
	description?: string;
	totalSessions: number;
	completedSessions: number;
	tier?: string;
};

type Session = {
	id: string;
	date: string;
	type: string;
	completed: boolean;
	notes?: string;
};

type AthleteDetail = {
	id: string;
	name: string;
	age: number | null;
	athleteType: string;
	team?: { name: string } | null;
	currentProgramTier?: string | null;
	performanceGoals?: string | null;
	injuries?: string | null;
	programs: Program[];
	recentSessions: Session[];
};

function ChildDetailPage() {
	const { athleteId } = Route.useParams();
	const navigate = useNavigate();

	const { data: child, isLoading } = useQuery<AthleteDetail>({
		queryKey: queryKeys.child(athleteId),
		queryFn: () => api.get<AthleteDetail>(`/api/portal/guardian/children/${athleteId}`),
	});

	if (isLoading) {
		return (
			<div className="p-6 max-w-3xl mx-auto">
				<div className="animate-pulse space-y-4">
					<div className="h-5 bg-muted w-32" />
					<div className="h-8 bg-muted w-48" />
					<div className="grid grid-cols-2 gap-3">
						{[1, 2, 3, 4].map((i) => <div key={i} className="h-24 bg-muted" />)}
					</div>
				</div>
			</div>
		);
	}

	if (!child) {
		return (
			<div className="p-6 max-w-3xl mx-auto text-center pt-20">
				<p className="text-muted-foreground font-mono">Child not found.</p>
				<button
					type="button"
					onClick={() => navigate({ to: "/children" })}
					className="mt-4 text-primary text-sm hover:underline font-mono"
				>
					Back to children
				</button>
			</div>
		);
	}

	const totalSessions = child.programs.reduce((s, p) => s + p.totalSessions, 0);
	const completedSessions = child.programs.reduce((s, p) => s + p.completedSessions, 0);
	const progressPct = totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0;

	return (
		<div className="p-6 max-w-3xl mx-auto space-y-6">
			<button
				type="button"
				onClick={() => navigate({ to: "/children" })}
				className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors font-mono"
			>
				<ArrowLeft size={14} /> Back to children
			</button>

			{/* Header */}
			<div className="flex items-center gap-4">
				<div className="w-14 h-14 bg-primary/10 flex items-center justify-center flex-shrink-0">
					<span className="text-primary font-black text-xl">{child.name.charAt(0)}</span>
				</div>
				<div>
					<h1 className="text-2xl font-black uppercase tracking-tight text-foreground">{child.name}</h1>
					<div className="flex items-center gap-2 mt-1 flex-wrap">
						{child.age && <span className="text-sm text-muted-foreground font-mono">Age {child.age}</span>}
						<span className={cn(
							"px-2 py-0.5 text-xs font-mono border",
							child.athleteType === "youth"
								? "bg-primary/5 text-primary border-primary/20"
								: "bg-muted text-muted-foreground border-border",
						)}>
							{child.athleteType}
						</span>
						{child.team && (
							<span className="px-2 py-0.5 text-xs font-mono border border-border bg-muted text-muted-foreground">
								{child.team.name}
							</span>
						)}
					</div>
				</div>
			</div>

			{/* Stats */}
			<div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
				{[
					{ label: "Programs",      value: child.programs.length, icon: BookOpen },
					{ label: "Sessions done", value: completedSessions,     icon: Activity },
					{ label: "Total",         value: totalSessions,         icon: Calendar },
					{ label: "Progress",      value: `${progressPct}%`,     icon: Target },
				].map(({ label, value, icon: Icon }) => (
					<div key={label} className="bento-card p-4">
						<Icon size={13} className="text-primary mb-2" />
						<div className="text-2xl font-black text-foreground">{value}</div>
						<div className="label-mono mt-0.5">{label}</div>
					</div>
				))}
			</div>

			{/* Programs */}
			{child.programs.length > 0 && (
				<section className="space-y-3">
					<h2 className="label-mono">Assigned Programs</h2>
					<div className="space-y-2">
						{child.programs.map((program) => {
							const pct = program.totalSessions > 0
								? Math.round((program.completedSessions / program.totalSessions) * 100)
								: 0;
							return (
								<div key={program.id} className="bento-card p-4">
									<div className="flex items-start justify-between gap-2 mb-3">
										<div>
											<div className="font-bold text-sm text-foreground">{program.name}</div>
											{program.description && (
												<div className="text-xs text-muted-foreground mt-0.5 line-clamp-1 font-mono">{program.description}</div>
											)}
										</div>
										{program.tier && (
											<span className="px-2 py-0.5 text-xs font-mono bg-primary/5 text-primary border border-primary/20 flex-shrink-0">
												{program.tier}
											</span>
										)}
									</div>
									<div className="flex items-center gap-3">
										<div className="flex-1 h-1 bg-muted overflow-hidden">
											<div
												className="h-full bg-primary transition-all"
												style={{ width: `${pct}%` }}
											/>
										</div>
										<span className="text-xs text-muted-foreground font-mono w-20 text-right">
											{program.completedSessions}/{program.totalSessions}
										</span>
									</div>
								</div>
							);
						})}
					</div>
				</section>
			)}

			{/* Performance goals */}
			{child.performanceGoals && (
				<section className="space-y-2">
					<h2 className="label-mono">Performance Goals</h2>
					<div className="bento-card p-4">
						<p className="text-sm text-foreground">{child.performanceGoals}</p>
					</div>
				</section>
			)}

			{/* Recent sessions */}
			{child.recentSessions?.length > 0 && (
				<section className="space-y-3">
					<h2 className="label-mono">Recent Sessions</h2>
					<div className="space-y-2">
						{child.recentSessions.map((session) => (
							<div key={session.id} className="bento-card p-3.5 flex items-center gap-3">
								<div className={cn(
									"w-2 h-2 flex-shrink-0",
									session.completed ? "bg-primary" : "bg-muted-foreground/30",
								)} />
								<div className="flex-1 min-w-0">
									<div className="text-sm font-bold text-foreground">{session.type}</div>
									{session.notes && <div className="text-xs text-muted-foreground font-mono truncate">{session.notes}</div>}
								</div>
								<div className="text-xs text-muted-foreground font-mono flex-shrink-0">
									{format(new Date(session.date), "MMM d")}
								</div>
							</div>
						))}
					</div>
				</section>
			)}

			{/* Medical notes */}
			{child.injuries && (
				<section className="space-y-2">
					<h2 className="label-mono">Medical Notes</h2>
					<div className="border border-amber-200 bg-amber-50 p-4">
						<p className="text-sm text-amber-800">{child.injuries}</p>
					</div>
				</section>
			)}
		</div>
	);
}
