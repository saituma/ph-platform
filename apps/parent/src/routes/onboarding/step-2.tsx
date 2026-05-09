import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Users, User, Trophy, Calendar, Layers } from "lucide-react";
import { api } from "#/lib/api-client";

export const Route = createFileRoute("/onboarding/step-2")({
	component: Step2,
});

type Child = {
	id: number;
	name: string;
	age: number;
	athleteType: string;
	team: { name: string } | null;
	currentProgramTier: string | null;
	currentPlanId: string | null;
	performanceGoals: string | null;
};

type GuardianChildren = {
	id: string | null;
	children: Child[];
};

function Step2() {
	const navigate = useNavigate();

	const { data, isLoading, isError } = useQuery<GuardianChildren>({
		queryKey: ["guardian-children"],
		queryFn: () => api.get<GuardianChildren>("/api/portal/guardian/children"),
		staleTime: 1000 * 60 * 5,
	});

	const children = data?.children ?? [];
	const child = children[0] ?? null;

	return (
		<div className="space-y-8 animate-fade-in-up">
			{/* Header */}
			<div className="space-y-3">
				<div className="flex items-center gap-2">
					<div className="w-8 h-8 bg-primary/10 flex items-center justify-center">
						<Users size={16} className="text-primary" />
					</div>
					<span className="label-mono">Step 2</span>
				</div>
				<h1 className="text-3xl font-black uppercase tracking-tight text-foreground">
					Your <span style={{ color: "var(--acid)" }}>child's</span><br />
					profile
				</h1>
				<p className="text-muted-foreground text-sm">
					Here's the athlete profile linked to your account
				</p>
			</div>

			{isLoading && (
				<div className="bento-card p-8 flex items-center justify-center">
					<div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
				</div>
			)}

			{isError && (
				<div className="bento-card p-6 border-destructive/40">
					<p className="text-sm text-destructive">Could not load profile. Please continue and we'll sync shortly.</p>
				</div>
			)}

			{!isLoading && !isError && child && (
				<div className="bento-card p-6 space-y-5">
					{/* Avatar + name */}
					<div className="flex items-center gap-4">
						<div className="w-14 h-14 bg-primary/10 flex items-center justify-center flex-shrink-0">
							<span className="text-primary font-black text-xl">
								{child.name.charAt(0).toUpperCase()}
							</span>
						</div>
						<div className="min-w-0">
							<span className="label-mono mb-1 block">Name</span>
							<div className="text-lg font-black uppercase tracking-tight text-foreground truncate">{child.name}</div>
							<div className="flex items-center gap-2 mt-0.5">
								<span className="label-mono">
									{child.athleteType === "youth" ? "Youth athlete" : "Adult athlete"}
								</span>
								{child.team && (
									<>
										<span className="text-muted-foreground/40">·</span>
										<span className="label-mono">{child.team.name}</span>
									</>
								)}
							</div>
						</div>
					</div>

					<div className="h-px bg-border" />

					{/* Stats row */}
					<div className="grid grid-cols-3 gap-3">
						<div className="space-y-1">
							<div className="flex items-center gap-1.5">
								<Calendar size={11} className="text-muted-foreground/50" />
								<span className="label-mono">Age</span>
							</div>
							<div className="text-2xl font-black text-foreground">{child.age || "—"}</div>
						</div>

						<div className="space-y-1">
							<div className="flex items-center gap-1.5">
								{child.athleteType === "youth" ? (
									<User size={11} className="text-muted-foreground/50" />
								) : (
									<Users size={11} className="text-muted-foreground/50" />
								)}
								<span className="label-mono">Type</span>
							</div>
							<div className="text-sm font-bold uppercase tracking-tight text-foreground capitalize">
								{child.athleteType ?? "—"}
							</div>
						</div>

						<div className="space-y-1">
							<div className="flex items-center gap-1.5">
								<Layers size={11} className="text-muted-foreground/50" />
								<span className="label-mono">Tier</span>
							</div>
							<div className="text-sm font-bold uppercase tracking-tight text-foreground">
								{child.currentProgramTier ?? "—"}
							</div>
						</div>
					</div>

					{child.performanceGoals && (
						<>
							<div className="h-px bg-border" />
							<div className="space-y-1.5">
								<div className="flex items-center gap-1.5">
									<Trophy size={11} className="text-muted-foreground/50" />
									<span className="label-mono">Performance goals</span>
								</div>
								<p className="text-sm text-foreground/80 leading-relaxed">{child.performanceGoals}</p>
							</div>
						</>
					)}
				</div>
			)}

			{!isLoading && !isError && !child && (
				<div className="bento-card p-6 space-y-2">
					<p className="label-mono text-muted-foreground">No athlete linked</p>
					<p className="text-sm text-muted-foreground leading-relaxed">
						Your child's profile will appear here once their account is set up by your coach or admin.
					</p>
				</div>
			)}

			<div className="flex gap-3">
				<button
					type="button"
					onClick={() => navigate({ to: "/onboarding/step-1" })}
					className="flex items-center justify-center px-4 py-3 border border-border text-foreground/60 hover:text-foreground hover:border-foreground/30 transition-all"
				>
					<ArrowLeft size={15} />
				</button>
				<button
					type="button"
					onClick={() => navigate({ to: "/onboarding/step-3" })}
					disabled={isLoading}
					className="flex-1 flex items-center justify-center gap-2 py-3 px-5 font-bold text-xs uppercase tracking-widest transition-all bg-primary text-primary-foreground hover:opacity-90 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
				>
					<ArrowRight size={13} /> Continue
				</button>
			</div>
		</div>
	);
}
