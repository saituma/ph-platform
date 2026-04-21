import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CheckCircle, Lock, Play } from "lucide-react";
import { useEffect, useState } from "react";
import { usePortal } from "@/portal/PortalContext";
import {
	fetchTeamWorkspace,
	type TrainingContentV2Workspace,
} from "@/services/programsService";

type WorkspaceModule = {
	id: number;
	order: number;
	title: string;
	description?: string | null;
	imageUrl?: string | null;
	locked?: boolean;
	lockedReason?: string | null;
	completed?: boolean;
};

type WorkspaceItem = {
	id: number | string;
	title: string;
	body?: string | null;
	videoUrl?: string | null;
	metadata?: { sets?: number; reps?: number } | null;
};

type WorkspaceSection = {
	type: string;
	label: string;
	items: WorkspaceItem[];
};

export const Route = createFileRoute("/portal/programs/")({
	component: ProgramsPage,
});

function ProgramsPage() {
	const [workspace, setWorkspace] = useState<TrainingContentV2Workspace | null>(
		null,
	);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const navigate = useNavigate();
	const {
		token,
		age,
		loading: portalLoading,
		error: portalError,
	} = usePortal();

	useEffect(() => {
		const loadData = async () => {
			try {
				setLoading(true);
				if (!token) throw new Error("Not authenticated");
				const workspaceData = await fetchTeamWorkspace(token, age);
				setWorkspace(workspaceData);
			} catch (err) {
				setError(
					err instanceof Error ? err.message : "Failed to load programs",
				);
			} finally {
				setLoading(false);
			}
		};

		if (!portalLoading) loadData();
	}, [token, age, portalLoading]);

	if (portalLoading || loading) {
		return (
			<div className="flex h-screen items-center justify-center pb-20">
				<div className="text-center">
					<div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
					<p className="mt-4 text-sm text-muted-foreground">
						Loading your training programs...
					</p>
				</div>
			</div>
		);
	}

	if (portalError || error || !workspace) {
		return (
			<div className="flex h-screen items-center justify-center pb-20 px-4">
				<div className="text-center">
					<p className="text-muted-foreground mb-4">
						{portalError || error || "Could not load programs"}
					</p>
					<button
						type="button"
						onClick={() => window.location.reload()}
						className="px-4 py-2 border rounded-lg hover:bg-primary/10"
					>
						Try Again
					</button>
				</div>
			</div>
		);
	}

	return (
		<div className="container mx-auto p-4 pb-20 space-y-8">
			<div>
				<h1 className="text-3xl font-black italic uppercase tracking-tight">
					Training <span className="text-primary">Programs</span>
				</h1>
				<p className="text-muted-foreground font-medium mt-1">
					{workspace.age
						? `Tailored for age ${workspace.age}`
						: "Personalized for your performance"}
				</p>
			</div>

			{/* Modules (Training Cycles) */}
			{(() => {
				const modules = (workspace.modules ?? []) as WorkspaceModule[];
				if (modules.length === 0) return null;

				return (
					<section className="space-y-4">
						<h2 className="text-xl font-bold border-l-4 border-primary pl-3">
							Active Modules
						</h2>
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
							{modules.map((module) => (
								<div
									key={module.id}
									className={`group relative rounded-3xl overflow-hidden border bg-card transition-all ${
										module.locked
											? "opacity-75 grayscale-[0.5] border-border cursor-not-allowed"
											: "hover:border-primary/50 hover:shadow-xl"
									}`}
								>
									{module.imageUrl && (
										<div className="aspect-video w-full overflow-hidden relative">
											<img
												src={module.imageUrl}
												alt=""
												className={`w-full h-full object-cover transition-transform duration-500 ${!module.locked && "group-hover:scale-105"}`}
											/>
											{module.locked && (
												<div className="absolute inset-0 bg-background/60 backdrop-blur-[2px] flex items-center justify-center">
													<div className="bg-card p-3 rounded-2xl shadow-xl border border-border">
														<Lock className="w-8 h-8 text-muted-foreground" />
													</div>
												</div>
											)}
										</div>
									)}

									<div className="p-6 space-y-3">
										<div className="flex justify-between items-start gap-2">
											<h3 className="text-lg font-bold leading-tight uppercase italic flex-1">
												{module.order}. {module.title}
											</h3>
											{module.completed && (
												<CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
											)}
										</div>

										<p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
											{module.description || "Training module for this stage."}
										</p>

										<div className="pt-2">
											{module.locked ? (
												<div className="flex flex-col gap-2">
													<div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
														<Lock className="w-3 h-3" />
														{module.lockedReason === "tier"
															? "Premium Content"
															: "Requires Progress"}
													</div>
													<p className="text-xs text-muted-foreground italic">
														{module.lockedReason === "tier"
															? "Upgrade your plan to unlock this stage."
															: "Finish previous modules to unlock."}
													</p>
												</div>
											) : (
												<button
													type="button"
													onClick={() =>
														navigate({
															to: "/portal/programs/module/$moduleId",
															params: { moduleId: String(module.id) },
														})
													}
													className="w-full mt-2 py-3 bg-primary/10 text-primary rounded-xl font-bold text-sm hover:bg-primary hover:text-primary-foreground transition-all flex items-center justify-center gap-2"
												>
													<Play className="w-4 h-4 fill-current" />
													Open Module
												</button>
											)}
										</div>
									</div>
								</div>
							))}
						</div>
					</section>
				);
			})()}

			{/* Others (Sections like 'Tempo goblet squat' from your example) */}
			{((workspace.others ?? []) as WorkspaceSection[]).map((section) => (
				<section key={section.type} className="space-y-4">
					<h2 className="text-xl font-bold border-l-4 border-primary pl-3">
						{section.label}
					</h2>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
						{section.items.map((item) => (
							<div
								key={item.id}
								className="p-6 rounded-3xl border bg-card/50 backdrop-blur-sm hover:border-primary/30 transition-all flex flex-col md:flex-row gap-6"
							>
								{item.videoUrl && (
									<div className="w-full md:w-48 aspect-video rounded-2xl overflow-hidden bg-black shrink-0">
										{/* Video placeholder or iframe would go here */}
										<div className="w-full h-full flex items-center justify-center bg-primary/5">
											<svg
												xmlns="http://www.w3.org/2000/svg"
												width="32"
												height="32"
												viewBox="0 0 24 24"
												fill="currentColor"
												className="text-primary"
												aria-hidden="true"
												focusable="false"
											>
												<path d="M8 5v14l11-7z" />
											</svg>
										</div>
									</div>
								)}
								<div className="flex-1 space-y-2">
									<h3 className="font-bold text-lg uppercase italic">
										{item.title}
									</h3>
									<div className="text-sm text-muted-foreground leading-relaxed">
										{/* Render basic markdown/body */}
										<p className="line-clamp-3">{item.body}</p>
									</div>
									<div className="pt-4 flex items-center gap-3">
										<button
											type="button"
											className="px-4 py-2 bg-primary/10 text-primary rounded-lg text-xs font-bold hover:bg-primary hover:text-primary-foreground transition-all"
										>
											View Content
										</button>
										{item.metadata?.sets && (
											<span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">
												{item.metadata.sets} Sets × {item.metadata.reps} Reps
											</span>
										)}
									</div>
								</div>
							</div>
						))}
					</div>
				</section>
			))}

			{workspace.modules.length === 0 && workspace.others.length === 0 && (
				<div className="text-center py-20 rounded-3xl border-2 border-dashed border-muted">
					<p className="text-muted-foreground font-medium">
						No training programs assigned to your current age/tier.
					</p>
					<button
						type="button"
						className="mt-4 text-primary font-bold hover:underline"
					>
						Contact Coach
					</button>
				</div>
			)}
		</div>
	);
}
