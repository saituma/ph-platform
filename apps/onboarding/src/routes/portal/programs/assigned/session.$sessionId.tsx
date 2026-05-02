import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
	ArrowLeft,
	Dumbbell,
	ExternalLink,
	Info,
	Video,
} from "lucide-react";
import { getTokenStatus } from "@/lib/client-storage";
import { usePortal } from "@/portal/PortalContext";
import { fetchMySessionExercises } from "@/services/programsService";
import { programKeys } from "../index";

export const Route = createFileRoute(
	"/portal/programs/assigned/session/$sessionId",
)({
	loader: async ({ params, context: { queryClient } }) => {
		const status = await getTokenStatus();
		const sessionId = Number(params.sessionId);
		if (status.authenticated && !Number.isNaN(sessionId)) {
			await queryClient.ensureQueryData({
				queryKey: [...programKeys.all, "session-exercises", "cookie", sessionId],
				queryFn: () => fetchMySessionExercises("cookie", sessionId),
			});
		}
	},
	component: AssignedSessionDetailPage,
});

type SessionExercise = {
	id: number;
	order: number;
	coachingNotes: string | null;
	exercise: {
		id: number;
		name: string;
		category: string | null;
		sets: number | null;
		reps: number | null;
		duration: number | null;
		restSeconds: number | null;
		videoUrl: string | null;
		cues: string | null;
		howTo: string | null;
		notes: string | null;
	};
};

function normalizeVideoSource(rawUrl: string) {
	const url = rawUrl.trim();
	if (!url) return null;

	if (/\.(mp4|webm|ogg|mov|m4v)(\?|#|$)/i.test(url)) {
		return { kind: "html5" as const, url };
	}

	try {
		const parsed = new URL(url);
		const host = parsed.hostname.replace(/^www\./, "");

		if (host === "youtu.be") {
			const id = parsed.pathname.split("/").filter(Boolean)[0];
			if (id)
				return {
					kind: "youtube" as const,
					url: `https://www.youtube.com/embed/${encodeURIComponent(id)}?rel=0&modestbranding=1`,
				};
		}

		if (host.endsWith("youtube.com")) {
			const v = parsed.searchParams.get("v");
			if (v)
				return {
					kind: "youtube" as const,
					url: `https://www.youtube.com/embed/${encodeURIComponent(v)}?rel=0&modestbranding=1`,
				};
			const embed = parsed.pathname.match(/^\/embed\/([^/]+)/);
			if (embed?.[1])
				return {
					kind: "youtube" as const,
					url: `https://www.youtube.com/embed/${encodeURIComponent(embed[1])}?rel=0&modestbranding=1`,
				};
		}

		if (host === "loom.com") {
			const share = parsed.pathname.match(/^\/(share|embed)\/([^/]+)/);
			if (share?.[2])
				return {
					kind: "loom" as const,
					url: `https://www.loom.com/embed/${encodeURIComponent(share[2])}`,
				};
		}
	} catch {
		// not a URL
	}

	return { kind: "link" as const, url };
}

function VideoPlayer({ videoUrl }: { videoUrl: string }) {
	const source = normalizeVideoSource(videoUrl);
	if (!source) return null;

	if (source.kind === "youtube" || source.kind === "loom") {
		return (
			<iframe
				src={source.url}
				className="w-full h-full"
				allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
				allowFullScreen
				title="Exercise video"
			/>
		);
	}

	if (source.kind === "html5") {
		return (
			<video className="w-full h-full" controls playsInline preload="metadata">
				<source src={source.url} />
				<track
					kind="captions"
					src="data:text/vtt,WEBVTT%0A%0A"
					srcLang="en"
					label="Captions"
				/>
			</video>
		);
	}

	return (
		<div className="w-full h-full flex flex-col items-center justify-center gap-3 p-6">
			<Video className="w-10 h-10 text-muted-foreground/30" />
			<a
				href={source.url}
				target="_blank"
				rel="noreferrer"
				className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
			>
				Open video <ExternalLink className="w-3 h-3" />
			</a>
		</div>
	);
}

function AssignedSessionDetailPage() {
	const { sessionId } = Route.useParams();
	const navigate = useNavigate();
	const { token, loading: portalLoading, error: portalError } = usePortal();

	const sessionIdNumber = Number(sessionId);

	const {
		data: exercisesData,
		isLoading,
		error: exercisesError,
	} = useQuery({
		queryKey: [...programKeys.all, "session-exercises", token, sessionIdNumber],
		queryFn: () => fetchMySessionExercises(token!, sessionIdNumber),
		enabled: !!token && !portalLoading && !Number.isNaN(sessionIdNumber),
		staleTime: 1000 * 60 * 15,
	});

	if (portalLoading || isLoading) {
		return (
			<div className="flex h-screen items-center justify-center pb-20">
				<div className="text-center">
					<div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
					<p className="mt-4 text-sm text-muted-foreground">
						Loading session...
					</p>
				</div>
			</div>
		);
	}

	if (portalError || exercisesError || !exercisesData) {
		return (
			<div className="flex h-screen items-center justify-center pb-20 px-4">
				<div className="text-center">
					<p className="text-muted-foreground mb-4">
						{portalError ||
							(exercisesError instanceof Error
								? exercisesError.message
								: "Session not found or not assigned to you.")}
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

	const exercises = (exercisesData.exercises ?? []) as SessionExercise[];

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
					Session <span className="text-primary">Exercises</span>
				</h1>
			</div>

			{exercises.length === 0 ? (
				<div className="text-center py-20 rounded-3xl border-2 border-dashed border-muted">
					<p className="text-muted-foreground font-medium">
						No exercises in this session yet.
					</p>
				</div>
			) : (
				<div className="space-y-8">
					{exercises.map((item, idx) => (
						<div
							key={item.id}
							className="rounded-3xl border bg-card overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500"
							style={{ animationDelay: `${idx * 80}ms` }}
						>
							<div className="p-6 border-b bg-card/80 flex items-center gap-4">
								<div className="p-2 bg-primary/10 rounded-xl text-primary">
									<Dumbbell className="w-5 h-5" />
								</div>
								<div className="flex-1">
									<h2 className="text-lg font-bold uppercase italic">
										{item.order}. {item.exercise.name}
									</h2>
									{item.exercise.category && (
										<span className="text-xs text-muted-foreground capitalize">
											{item.exercise.category}
										</span>
									)}
								</div>
							</div>

							<div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
								{item.exercise.videoUrl && (
									<div className="aspect-video bg-black">
										<VideoPlayer videoUrl={item.exercise.videoUrl} />
									</div>
								)}

								<div className="p-6 space-y-4">
									{(item.exercise.sets ||
										item.exercise.reps ||
										item.exercise.duration ||
										item.exercise.restSeconds) && (
										<div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
											{item.exercise.sets && (
												<div className="bg-primary/5 border border-primary/10 rounded-2xl p-3 text-center">
													<p className="text-[10px] font-black uppercase tracking-widest text-primary/60">
														Sets
													</p>
													<p className="text-xl font-black text-primary">
														{item.exercise.sets}
													</p>
												</div>
											)}
											{item.exercise.reps && (
												<div className="bg-primary/5 border border-primary/10 rounded-2xl p-3 text-center">
													<p className="text-[10px] font-black uppercase tracking-widest text-primary/60">
														Reps
													</p>
													<p className="text-xl font-black text-primary">
														{item.exercise.reps}
													</p>
												</div>
											)}
											{item.exercise.duration && (
												<div className="bg-primary/5 border border-primary/10 rounded-2xl p-3 text-center">
													<p className="text-[10px] font-black uppercase tracking-widest text-primary/60">
														Duration
													</p>
													<p className="text-xl font-black text-primary">
														{item.exercise.duration}s
													</p>
												</div>
											)}
											{item.exercise.restSeconds && (
												<div className="bg-primary/5 border border-primary/10 rounded-2xl p-3 text-center">
													<p className="text-[10px] font-black uppercase tracking-widest text-primary/60">
														Rest
													</p>
													<p className="text-xl font-black text-primary">
														{item.exercise.restSeconds}s
													</p>
												</div>
											)}
										</div>
									)}

									{item.exercise.howTo && (
										<div>
											<h3 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground mb-2 flex items-center gap-2">
												<Info className="w-3 h-3" />
												How To
											</h3>
											<p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
												{item.exercise.howTo}
											</p>
										</div>
									)}

									{item.exercise.cues && (
										<div>
											<h3 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground mb-2">
												Coaching Cues
											</h3>
											<p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
												{item.exercise.cues}
											</p>
										</div>
									)}

									{item.coachingNotes && (
										<div className="bg-primary/5 border border-primary/20 rounded-2xl p-4">
											<h3 className="text-xs font-black uppercase tracking-[0.2em] text-primary mb-2">
												Coach Notes
											</h3>
											<p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
												{item.coachingNotes}
											</p>
										</div>
									)}
								</div>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
}
