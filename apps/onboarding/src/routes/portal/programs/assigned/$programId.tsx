import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ChevronRight, Clock, Dumbbell } from "lucide-react";
import { getTokenStatus } from "@/lib/client-storage";
import { usePortal } from "@/portal/PortalContext";
import { fetchMyProgramFull } from "@/services/programsService";
import { programKeys } from "../index";

export const Route = createFileRoute(
	"/portal/programs/assigned/$programId",
)({
	loader: async ({ params, context: { queryClient } }) => {
		const status = await getTokenStatus();
		const programId = Number(params.programId);
		if (status.authenticated && !Number.isNaN(programId)) {
			await queryClient.ensureQueryData({
				queryKey: [...programKeys.all, "assigned-full", "cookie", programId],
				queryFn: () => fetchMyProgramFull("cookie", programId),
			});
		}
	},
	component: AssignedProgramDetailPage,
});

type ProgramModule = {
	id: number;
	title: string;
	description: string | null;
	order: number;
	sessionCount: number;
	sessions: {
		id: number;
		title: string | null;
		weekNumber: number | null;
		sessionNumber: number | null;
		type: string | null;
		exerciseCount: number;
	}[];
};

type ProgramFull = {
	id: number;
	name: string;
	description: string | null;
	modules: ProgramModule[];
};

function AssignedProgramDetailPage() {
	const { programId } = Route.useParams();
	const navigate = useNavigate();
	const { token, loading: portalLoading, error: portalError } = usePortal();

	const programIdNumber = Number(programId);

	const {
		data: program,
		isLoading,
		error: programError,
	} = useQuery({
		queryKey: [...programKeys.all, "assigned-full", token, programIdNumber],
		queryFn: () => fetchMyProgramFull(token!, programIdNumber),
		enabled: !!token && !portalLoading && !Number.isNaN(programIdNumber),
		staleTime: 1000 * 60 * 15,
	});

	if (portalLoading || isLoading) {
		return (
			<div className="flex h-screen items-center justify-center pb-20">
				<div className="text-center">
					<div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
					<p className="mt-4 text-sm text-muted-foreground">
						Loading program...
					</p>
				</div>
			</div>
		);
	}

	if (portalError || programError || !program) {
		return (
			<div className="flex h-screen items-center justify-center pb-20 px-4">
				<div className="text-center">
					<p className="text-muted-foreground mb-4">
						{portalError ||
							(programError instanceof Error
								? programError.message
								: "Program not found or not assigned to you.")}
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

	const typedProgram = program as ProgramFull;

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
				<div>
					<h1 className="text-2xl font-black italic uppercase tracking-tight">
						{typedProgram.name}
					</h1>
					{typedProgram.description && (
						<p className="text-muted-foreground text-sm mt-1">
							{typedProgram.description}
						</p>
					)}
				</div>
			</div>

			{typedProgram.modules.length === 0 ? (
				<div className="text-center py-20 rounded-3xl border-2 border-dashed border-muted">
					<p className="text-muted-foreground font-medium">
						No modules in this program yet.
					</p>
					<p className="text-sm text-muted-foreground mt-2">
						Your coach is still building this program.
					</p>
				</div>
			) : (
				<div className="space-y-6">
					{typedProgram.modules.map((mod) => (
						<div
							key={mod.id}
							className="rounded-3xl border bg-card overflow-hidden"
						>
							<div className="p-6 border-b bg-card/80">
								<div className="flex items-center justify-between">
									<div>
										<h2 className="text-lg font-bold uppercase italic">
											Module {mod.order}: {mod.title}
										</h2>
										{mod.description && (
											<p className="text-sm text-muted-foreground mt-1 line-clamp-2">
												{mod.description}
											</p>
										)}
									</div>
									<span className="text-xs font-bold text-primary bg-primary/10 px-3 py-1 rounded-full">
										{mod.sessionCount}{" "}
										{mod.sessionCount === 1 ? "session" : "sessions"}
									</span>
								</div>
							</div>

							{mod.sessions.length > 0 && (
								<div className="divide-y">
									{mod.sessions.map((session) => (
										<button
											key={session.id}
											type="button"
											onClick={() =>
												navigate({
													to: "/portal/programs/assigned/session/$sessionId",
													params: { sessionId: String(session.id) },
												})
											}
											className="w-full p-4 flex items-center gap-4 hover:bg-muted/50 transition-colors text-left"
										>
											<div className="p-2 bg-primary/10 rounded-xl text-primary">
												<Dumbbell className="w-5 h-5" />
											</div>
											<div className="flex-1 min-w-0">
												<p className="font-bold text-sm truncate">
													{session.title ||
														`Week ${session.weekNumber}, Session ${session.sessionNumber}`}
												</p>
												<div className="flex items-center gap-3 mt-0.5">
													{session.type && (
														<span className="text-xs text-muted-foreground capitalize">
															{session.type}
														</span>
													)}
													<span className="text-xs text-muted-foreground flex items-center gap-1">
														<Clock className="w-3 h-3" />
														{session.exerciseCount} exercises
													</span>
												</div>
											</div>
											<ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
										</button>
									))}
								</div>
							)}
						</div>
					))}
				</div>
			)}
		</div>
	);
}
