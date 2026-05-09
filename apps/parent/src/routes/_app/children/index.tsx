import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Plus, Users, ArrowRight, Trophy, Activity } from "lucide-react";
import { api } from "#/lib/api-client";
import { queryKeys } from "#/lib/query-keys";
import { cn } from "#/lib/utils";

export const Route = createFileRoute("/_app/children/")({
	component: ChildrenPage,
});

type Child = {
	id: string;
	name: string;
	age: number | null;
	athleteType: "youth" | "adult";
	team?: { id: string; name: string } | null;
	currentProgramTier?: string | null;
	currentPlanId?: string | null;
	performanceGoals?: string | null;
};

type GuardianChildren = { children: Child[] };

function ChildrenPage() {
	const navigate = useNavigate();

	const { data, isLoading } = useQuery<GuardianChildren>({
		queryKey: queryKeys.children,
		queryFn: () => api.get<GuardianChildren>("/api/portal/guardian/children"),
	});

	const children = data?.children ?? [];

	return (
		<div className="p-6 max-w-3xl mx-auto space-y-6">
			<div className="flex items-end justify-between">
				<div className="space-y-1">
					<p className="label-mono">Management</p>
					<h1 className="text-2xl font-black uppercase tracking-tight text-foreground">My Children</h1>
					<p className="text-muted-foreground text-sm">Monitor and manage your child athletes</p>
				</div>
				<button
					type="button"
					onClick={() => navigate({ to: "/children/add" })}
					className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground text-xs font-bold uppercase tracking-widest hover:opacity-90 transition-opacity"
				>
					<Plus size={13} /> Add child
				</button>
			</div>

			{isLoading ? (
				<div className="space-y-3">
					{[1, 2].map((i) => (
						<div key={i} className="bento-card p-5 animate-pulse">
							<div className="flex items-center gap-4">
								<div className="w-11 h-11 bg-muted" />
								<div className="flex-1 space-y-2">
									<div className="h-4 bg-muted w-1/3" />
									<div className="h-3 bg-muted w-1/4" />
								</div>
							</div>
						</div>
					))}
				</div>
			) : children.length === 0 ? (
				<div className="border border-dashed border-border p-14 text-center">
					<Users size={40} className="mx-auto text-muted-foreground/20 mb-4" />
					<p className="text-base font-black text-foreground uppercase tracking-wide mb-1">No children yet</p>
					<p className="text-sm text-muted-foreground mb-6 max-w-xs mx-auto font-mono">
						Add your child's profile to start tracking their training and performance
					</p>
					<button
						type="button"
						onClick={() => navigate({ to: "/children/add" })}
						className="px-5 py-2.5 bg-primary text-primary-foreground text-xs font-bold uppercase tracking-widest hover:opacity-90 transition-opacity"
					>
						Add your first child
					</button>
				</div>
			) : (
				<div className="space-y-3">
					{children.map((child) => (
						<button
							key={child.id}
							type="button"
							onClick={() => navigate({ to: "/children/$athleteId", params: { athleteId: child.id } })}
							className="w-full bento-card p-5 text-left group"
						>
							<div className="flex items-center gap-4">
								<div className="w-11 h-11 bg-primary/10 flex items-center justify-center flex-shrink-0">
									<span className="text-primary font-black text-sm">{child.name.charAt(0)}</span>
								</div>
								<div className="flex-1 min-w-0">
									<div className="flex items-center gap-2 mb-1">
										<span className="font-bold text-foreground">{child.name}</span>
										{child.age && <span className="text-xs text-muted-foreground font-mono">Age {child.age}</span>}
									</div>
									<div className="flex flex-wrap gap-1.5">
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
										{child.currentProgramTier && (
											<span className="px-2 py-0.5 text-xs font-mono bg-primary/5 text-primary border border-primary/20">
												{child.currentProgramTier}
											</span>
										)}
									</div>
								</div>
								<div className="flex items-center gap-3 text-muted-foreground/40">
									{child.currentPlanId && <Trophy size={14} className="text-yellow-500" />}
									{child.currentProgramTier && <Activity size={14} className="text-primary" />}
									<ArrowRight size={14} className="group-hover:text-primary transition-colors" />
								</div>
							</div>

							{child.performanceGoals && (
								<div className="mt-3 pt-3 border-t border-border">
									<p className="text-xs text-muted-foreground font-mono line-clamp-1">
										Goal: {child.performanceGoals}
									</p>
								</div>
							)}
						</button>
					))}
				</div>
			)}
		</div>
	);
}
