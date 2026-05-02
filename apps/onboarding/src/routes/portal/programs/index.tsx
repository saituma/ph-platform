import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CheckCircle, ChevronRight, Lock, Play } from "lucide-react";
import { getTokenStatus } from "@/lib/client-storage";
import {
	motion,
	PageTransition,
	StaggerList,
	StaggerItem,
	Skeleton,
} from "@/lib/motion";
import { usePortal } from "@/portal/PortalContext";
import {
	fetchMyAssignedPrograms,
	fetchTeamWorkspace,
	type AssignedProgram,
} from "@/services/programsService";

export const programKeys = {
	all: ["programs"] as const,
	workspace: (token: string | null, age: number | null) =>
		[...programKeys.all, "workspace", token, age] as const,
	assigned: (token: string | null) =>
		[...programKeys.all, "assigned", token] as const,
};

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
	loader: async ({ context: { queryClient } }) => {
		const status = await getTokenStatus();
		if (status.authenticated) {
			await queryClient.ensureQueryData({
				queryKey: programKeys.workspace("cookie", null),
				queryFn: () => fetchTeamWorkspace("cookie", null),
			});
		}
	},
	component: ProgramsPage,
});

function ProgramsSkeleton() {
	return (
		<div className="container mx-auto p-4 pb-20 space-y-8">
			<div className="space-y-2">
				<Skeleton className="h-8 w-56" />
				<Skeleton className="h-4 w-40" />
			</div>
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
				{[1, 2, 3].map((i) => (
					<div key={i} className="rounded-3xl border p-6 space-y-3">
						<Skeleton className="h-5 w-3/4" />
						<Skeleton className="h-4 w-full" />
						<Skeleton className="h-4 w-2/3" />
						<Skeleton className="h-4 w-24" />
					</div>
				))}
			</div>
		</div>
	);
}

function ProgramsPage() {
	const {
		token,
		age,
		loading: portalLoading,
		error: portalError,
	} = usePortal();
	const navigate = useNavigate();

	const isAdult = age != null && age >= 18;

	const {
		data: assignedPrograms,
		isLoading: assignedLoading,
	} = useQuery({
		queryKey: programKeys.assigned(token),
		queryFn: () => fetchMyAssignedPrograms(token!),
		enabled: !!token && !portalLoading && isAdult,
		staleTime: 1000 * 60 * 15,
	});

	const {
		data: workspace,
		isLoading: programsLoading,
		error: programsError,
	} = useQuery({
		queryKey: programKeys.workspace(token, age),
		queryFn: () => fetchTeamWorkspace(token!, age),
		enabled: !!token && !portalLoading && !isAdult,
		staleTime: 1000 * 60 * 15,
	});

	if (portalLoading || (token && (assignedLoading || programsLoading))) {
		return <ProgramsSkeleton />;
	}

	if (portalError || programsError) {
		return (
			<PageTransition>
				<div className="flex h-screen items-center justify-center pb-20 px-4">
					<div className="text-center">
						<p className="text-muted-foreground mb-4">
							{portalError ||
								(programsError instanceof Error
									? programsError.message
									: "Could not load programs")}
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
			</PageTransition>
		);
	}

	if (isAdult) {
		return <AdultAssignedPrograms programs={assignedPrograms ?? []} navigate={navigate} />;
	}

	return <YouthAgeBasedPrograms workspace={workspace} navigate={navigate} />;
}

function AdultAssignedPrograms({
	programs,
	navigate,
}: {
	programs: AssignedProgram[];
	navigate: ReturnType<typeof useNavigate>;
}) {
	return (
		<PageTransition className="container mx-auto p-4 pb-20 space-y-8">
			<motion.div
				initial={{ opacity: 0, y: -10 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.4 }}
			>
				<h1 className="text-3xl font-black italic uppercase tracking-tight">
					My <span className="text-primary">Programs</span>
				</h1>
				<p className="text-muted-foreground font-medium mt-1">
					Your assigned training programs.
				</p>
			</motion.div>

			{programs.length === 0 ? (
				<motion.div
					initial={{ opacity: 0, scale: 0.97 }}
					animate={{ opacity: 1, scale: 1 }}
					transition={{ delay: 0.15 }}
					className="text-center py-20 rounded-3xl border-2 border-dashed border-muted"
				>
					<p className="text-muted-foreground font-medium">
						No programs assigned yet.
					</p>
					<p className="text-sm text-muted-foreground mt-2">
						Your coach will assign programs to you. Check back later.
					</p>
				</motion.div>
			) : (
				<StaggerList className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
					{programs.map((program) => (
						<StaggerItem key={program.id}>
							<motion.button
								whileHover={{ y: -4, borderColor: "rgba(138, 255, 0, 0.3)" }}
								whileTap={{ scale: 0.98 }}
								transition={{ duration: 0.2 }}
								type="button"
								onClick={() =>
									navigate({
										to: "/portal/programs/assigned/$programId",
										params: { programId: String(program.id) },
									})
								}
								className="w-full text-left group rounded-3xl overflow-hidden border bg-card hover:shadow-xl transition-shadow p-6 space-y-3"
							>
								<div className="flex justify-between items-start gap-2">
									<h3 className="text-lg font-bold leading-tight uppercase italic flex-1">
										{program.name}
									</h3>
									<ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all duration-200 shrink-0" />
								</div>
								{program.description && (
									<p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
										{program.description}
									</p>
								)}
								<p className="text-xs font-bold text-primary">
									{program.moduleCount} {program.moduleCount === 1 ? "module" : "modules"}
								</p>
							</motion.button>
						</StaggerItem>
					))}
				</StaggerList>
			)}
		</PageTransition>
	);
}

function YouthAgeBasedPrograms({
	workspace,
	navigate,
}: {
	workspace: { age: number | null; modules: any[]; others: any[] } | undefined;
	navigate: ReturnType<typeof useNavigate>;
}) {
	if (!workspace) {
		return (
			<PageTransition>
				<motion.div
					initial={{ opacity: 0, scale: 0.97 }}
					animate={{ opacity: 1, scale: 1 }}
					className="text-center py-20 rounded-3xl border-2 border-dashed border-muted mx-4 mt-8"
				>
					<p className="text-muted-foreground font-medium">
						No training programs available for your age group.
					</p>
				</motion.div>
			</PageTransition>
		);
	}

	return (
		<PageTransition className="container mx-auto p-4 pb-20 space-y-8">
			<motion.div
				initial={{ opacity: 0, y: -10 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.4 }}
			>
				<h1 className="text-3xl font-black italic uppercase tracking-tight">
					Training <span className="text-primary">Programs</span>
				</h1>
				<p className="text-muted-foreground font-medium mt-1">
					{workspace.age
						? `Tailored for age ${workspace.age}`
						: "Personalized for your performance"}
				</p>
			</motion.div>

			{(() => {
				const modules = (workspace.modules ?? []) as WorkspaceModule[];
				if (modules.length === 0) return null;

				return (
					<section className="space-y-4">
						<motion.h2
							initial={{ opacity: 0, x: -10 }}
							animate={{ opacity: 1, x: 0 }}
							transition={{ delay: 0.15 }}
							className="text-xl font-bold border-l-4 border-primary pl-3"
						>
							Active Modules
						</motion.h2>
						<StaggerList className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
							{modules.map((module) => (
								<StaggerItem key={module.id}>
									<motion.div
										whileHover={module.locked ? {} : { y: -4 }}
										transition={{ duration: 0.2 }}
										className={`group relative rounded-3xl overflow-hidden border bg-card transition-shadow ${
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
													<motion.div
														initial={{ scale: 0 }}
														animate={{ scale: 1 }}
														transition={{ type: "spring", stiffness: 300, delay: 0.3 }}
													>
														<CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
													</motion.div>
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
													<motion.button
														whileHover={{ scale: 1.02 }}
														whileTap={{ scale: 0.98 }}
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
													</motion.button>
												)}
											</div>
										</div>
									</motion.div>
								</StaggerItem>
							))}
						</StaggerList>
					</section>
				);
			})()}

			{((workspace.others ?? []) as WorkspaceSection[]).map((section, sectionIdx) => (
				<motion.section
					key={section.type}
					initial={{ opacity: 0, y: 12 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.2 + sectionIdx * 0.1 }}
					className="space-y-4"
				>
					<h2 className="text-xl font-bold border-l-4 border-primary pl-3">
						{section.label}
					</h2>
					<StaggerList className="grid grid-cols-1 md:grid-cols-2 gap-6">
						{section.items.map((item) => (
							<StaggerItem key={item.id}>
								<motion.div
									whileHover={{ y: -2 }}
									transition={{ duration: 0.2 }}
									className="p-6 rounded-3xl border bg-card/50 backdrop-blur-sm hover:border-primary/30 transition-colors flex flex-col md:flex-row gap-6"
								>
									{item.videoUrl && (
										<div className="w-full md:w-48 aspect-video rounded-2xl overflow-hidden bg-black shrink-0">
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
											<p className="line-clamp-3">{item.body}</p>
										</div>
										<div className="pt-4 flex items-center gap-3">
											<motion.button
												whileHover={{ scale: 1.03 }}
												whileTap={{ scale: 0.97 }}
												type="button"
												className="px-4 py-2 bg-primary/10 text-primary rounded-lg text-xs font-bold hover:bg-primary hover:text-primary-foreground transition-all"
											>
												View Content
											</motion.button>
											{item.metadata?.sets && (
												<span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">
													{item.metadata.sets} Sets × {item.metadata.reps} Reps
												</span>
											)}
										</div>
									</div>
								</motion.div>
							</StaggerItem>
						))}
					</StaggerList>
				</motion.section>
			))}

			{workspace.modules.length === 0 && workspace.others.length === 0 && (
				<motion.div
					initial={{ opacity: 0, scale: 0.97 }}
					animate={{ opacity: 1, scale: 1 }}
					className="text-center py-20 rounded-3xl border-2 border-dashed border-muted"
				>
					<p className="text-muted-foreground font-medium">
						No training programs assigned to your current age group.
					</p>
				</motion.div>
			)}
		</PageTransition>
	);
}
