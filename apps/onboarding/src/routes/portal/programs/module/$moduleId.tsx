import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
	ArrowLeft,
	CheckCircle,
	ChevronRight,
	Clock,
	Lock,
} from "lucide-react";
import { useEffect, useState } from "react";
import { usePortal } from "@/portal/PortalContext";
import {
	fetchTeamWorkspace,
	type TrainingContentV2Workspace,
} from "@/services/programsService";

type TrainingSession = {
	id: number;
	order: number;
	title: string;
	completed?: boolean;
	locked?: boolean;
	lockedReason?: string | null;
	dayLength?: number | null;
};

type TrainingModule = {
	id: number;
	order: number;
	title: string;
	locked?: boolean;
	lockedReason?: string | null;
	completed?: boolean;
	totalDayLength?: number | null;
	sessions: TrainingSession[];
};

export const Route = createFileRoute("/portal/programs/module/$moduleId")({
	component: ModuleDetailPage,
});

function ModuleDetailPage() {
	const { moduleId } = Route.useParams();
	const navigate = useNavigate();
	const [workspace, setWorkspace] = useState<TrainingContentV2Workspace | null>(
		null,
	);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const {
		token,
		age,
		loading: portalLoading,
		error: portalError,
	} = usePortal();

	const moduleIdNumber = Number(moduleId);

	useEffect(() => {
		const loadData = async () => {
			try {
				setLoading(true);
				if (!token) throw new Error("Not authenticated");
				const workspaceData = await fetchTeamWorkspace(token, age);
				setWorkspace(workspaceData);
			} catch (err) {
				setError(
					err instanceof Error ? err.message : "Failed to load module details",
				);
			} finally {
				setLoading(false);
			}
		};

		if (!portalLoading) loadData();
	}, [token, age, portalLoading]);

	const modules = (workspace?.modules ?? []) as TrainingModule[];
	const module = modules.find((m) => m.id === moduleIdNumber);

	if (portalLoading || loading) {
		return (
			<div className="flex h-screen items-center justify-center pb-20">
				<div className="text-center">
					<div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
					<p className="mt-4 text-sm text-muted-foreground">
						Loading module details...
					</p>
				</div>
			</div>
		);
	}

	if (portalError || error || !module) {
		return (
			<div className="flex h-screen items-center justify-center pb-20 px-4">
				<div className="text-center">
					<p className="text-muted-foreground mb-4">
						{portalError || error || "Module not found"}
					</p>
					<Link
						to="/portal/programs"
						className="text-primary font-bold hover:underline"
					>
						Back to Programs
					</Link>
				</div>
			</div>
		);
	}

	return (
		<div className="container mx-auto p-4 pb-20 space-y-8">
			<div className="flex items-center gap-4">
				<button
					type="button"
					onClick={() => navigate({ to: "/portal/programs" })}
					className="p-2 hover:bg-muted rounded-full transition-colors"
				>
					<ArrowLeft className="w-6 h-6" />
				</button>
				<h1 className="text-2xl font-black italic uppercase tracking-tight">
					Module {module.order}:{" "}
					<span className="text-primary">{module.title}</span>
				</h1>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
				<div className="md:col-span-2 space-y-6">
					{module.locked ? (
						<div className="p-8 rounded-3xl border bg-card/50 flex flex-col items-center text-center space-y-4">
							<div className="p-4 bg-muted rounded-full text-muted-foreground">
								<Lock className="w-12 h-12" />
							</div>
							<div>
								<h2 className="text-xl font-bold uppercase italic">
									Module Locked
								</h2>
								<p className="text-muted-foreground mt-2 max-w-md mx-auto">
									{module.lockedReason === "tier"
										? "Upgrade your plan to unlock this advanced module."
										: "Complete the previous modules to unlock this stage of your training."}
								</p>
							</div>
							<button
								type="button"
								className="px-8 py-3 bg-primary text-primary-foreground rounded-2xl font-bold shadow-xl shadow-primary/20"
							>
								How to Unlock
							</button>
						</div>
					) : (
						<div className="space-y-4">
							<h2 className="text-xl font-bold border-l-4 border-primary pl-3">
								Module Sessions
							</h2>
							<div className="grid grid-cols-1 gap-4">
								{module.sessions.map((session) => (
									<button
										key={session.id}
										type="button"
										disabled={session.locked}
										onClick={() => {
											navigate({
												to: "/portal/programs/session/$sessionId",
												params: { sessionId: String(session.id) },
											});
										}}
										className={`p-6 rounded-2xl border bg-card transition-all flex items-center justify-between gap-4 ${
											session.locked
												? "opacity-60 cursor-not-allowed grayscale-[0.5]"
												: "hover:border-primary/50 hover:shadow-md cursor-pointer"
										}`}
									>
										<div className="flex-1 space-y-1">
											<div className="flex items-center gap-2">
												<h3 className="font-bold text-lg leading-tight">
													{session.order}. {session.title}
												</h3>
												{session.completed && (
													<CheckCircle className="w-5 h-5 text-green-500" />
												)}
											</div>

											<div className="flex items-center gap-2 text-sm text-muted-foreground">
												<Clock className="w-4 h-4" />
												<span>{session.dayLength} day target</span>
											</div>

											{session.locked && (
												<div className="flex flex-col gap-1 mt-2">
													<div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1">
														<Lock className="w-3 h-3" />
														{session.lockedReason === "tier"
															? "Premium Access Required"
															: "Session Locked"}
													</div>
													<p className="text-xs text-muted-foreground italic">
														{session.lockedReason === "tier"
															? "This session requires a higher tier plan."
															: "Finish previous sessions to unlock."}
													</p>
												</div>
											)}
										</div>

										<div className="flex items-center gap-3">
											{session.locked ? (
												<div className="bg-muted p-2 rounded-xl">
													<Lock className="w-5 h-5 text-muted-foreground" />
												</div>
											) : (
												<div className="bg-primary/5 p-2 rounded-xl text-primary">
													<ChevronRight className="w-5 h-5" />
												</div>
											)}
										</div>
									</button>
								))}

								{module.sessions.length === 0 && (
									<div className="p-10 text-center border-2 border-dashed rounded-3xl">
										<p className="text-muted-foreground">
											No sessions defined for this module yet.
										</p>
									</div>
								)}
							</div>
						</div>
					)}
				</div>

				<div className="space-y-6">
					<div className="p-6 rounded-3xl border bg-card shadow-sm space-y-4">
						<h3 className="font-bold uppercase italic text-sm tracking-widest text-muted-foreground">
							Module Stats
						</h3>
						<div className="space-y-3">
							<div className="flex justify-between items-center">
								<span className="text-sm font-medium">Target Duration</span>
								<span className="font-bold">{module.totalDayLength} Days</span>
							</div>
							<div className="flex justify-between items-center">
								<span className="text-sm font-medium">Total Sessions</span>
								<span className="font-bold">
									{module.sessions.length} Sessions
								</span>
							</div>
							<div className="flex justify-between items-center">
								<span className="text-sm font-medium">Status</span>
								<span
									className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest ${module.completed ? "bg-green-500/10 text-green-500" : "bg-primary/10 text-primary"}`}
								>
									{module.completed
										? "Completed"
										: module.locked
											? "Locked"
											: "In Progress"}
								</span>
							</div>
						</div>
					</div>

					<div className="p-6 rounded-3xl border bg-primary/5 border-primary/20 space-y-3">
						<h3 className="font-bold text-primary italic">Coach Notes</h3>
						<p className="text-xs text-muted-foreground leading-relaxed">
							Maintain consistent intensity throughout this module. Quality over
							quantity is key for this block of your foundation training.
						</p>
					</div>
				</div>
			</div>
		</div>
	);
}
