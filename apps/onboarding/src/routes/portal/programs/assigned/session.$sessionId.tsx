import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
	ArrowLeft,
	CheckCircle,
	Dumbbell,
	ExternalLink,
	Info,
	Video,
	X,
} from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { getTokenStatus } from "@/lib/client-storage";
import { usePortal } from "@/portal/PortalContext";
import {
	completeSession,
	fetchMySessionExercises,
	presignVideoUpload,
} from "@/services/programsService";
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

function CompletionSheet({
	open,
	onClose,
	onSubmit,
	submitting,
}: {
	open: boolean;
	onClose: () => void;
	onSubmit: (data: {
		weightsUsed: string;
		repsCompleted: string;
		rpe: number | null;
		videoUrl: string | null;
	}) => void;
	submitting: boolean;
}) {
	const [weightsUsed, setWeightsUsed] = useState("");
	const [repsCompleted, setRepsCompleted] = useState("");
	const [rpe, setRpe] = useState<number | null>(null);
	const [videoFile, setVideoFile] = useState<File | null>(null);
	const [videoPreview, setVideoPreview] = useState<string | null>(null);
	const [uploading, setUploading] = useState(false);
	const [uploadProgress, setUploadProgress] = useState(0);
	const [uploadError, setUploadError] = useState<string | null>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;
		if (file.size > 200 * 1024 * 1024) {
			setUploadError("Video must be under 200MB");
			return;
		}
		setVideoFile(file);
		setVideoPreview(URL.createObjectURL(file));
		setUploadError(null);
	};

	const removeVideo = () => {
		setVideoFile(null);
		if (videoPreview) URL.revokeObjectURL(videoPreview);
		setVideoPreview(null);
		if (fileInputRef.current) fileInputRef.current.value = "";
	};

	const handleSubmit = async () => {
		let videoUrl: string | null = null;

		if (videoFile) {
			try {
				setUploading(true);
				setUploadProgress(0);
				const presign = await presignVideoUpload(videoFile);

				await new Promise<void>((resolve, reject) => {
					const xhr = new XMLHttpRequest();
					xhr.upload.onprogress = (ev) => {
						if (ev.lengthComputable) setUploadProgress(Math.round((ev.loaded / ev.total) * 100));
					};
					xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error("Upload failed")));
					xhr.onerror = () => reject(new Error("Upload failed"));
					xhr.open("PUT", presign.uploadUrl);
					xhr.setRequestHeader("Content-Type", videoFile.type || "video/mp4");
					xhr.send(videoFile);
				});

				videoUrl = presign.publicUrl;
			} catch (err: any) {
				setUploadError(err?.message || "Video upload failed");
				setUploading(false);
				return;
			} finally {
				setUploading(false);
			}
		}

		onSubmit({ weightsUsed, repsCompleted, rpe, videoUrl });
	};

	if (!open) return null;

	const busy = submitting || uploading;

	return (
		<div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
			<div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} onKeyDown={() => {}} />
			<div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto bg-card border border-border rounded-t-3xl sm:rounded-3xl p-6 animate-in slide-in-from-bottom-8 duration-300 shadow-2xl">
				<div className="flex items-center justify-between mb-6">
					<h2 className="text-lg font-black italic uppercase tracking-tight">Complete Session</h2>
					<button type="button" onClick={onClose} className="p-1 hover:bg-muted rounded-full transition-colors">
						<X className="w-5 h-5" />
					</button>
				</div>

				<div className="space-y-4">
					<label className="block">
						<span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
							Weights Used
						</span>
						<input
							className="mt-1 w-full h-10 rounded-xl border border-border bg-background px-3 text-sm"
							placeholder="e.g. 135 lbs squat, 95 lbs bench"
							value={weightsUsed}
							onChange={(e) => setWeightsUsed(e.target.value)}
							maxLength={2000}
						/>
					</label>

					<label className="block">
						<span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
							Reps Completed
						</span>
						<input
							className="mt-1 w-full h-10 rounded-xl border border-border bg-background px-3 text-sm"
							placeholder="e.g. 10, 8, 6"
							value={repsCompleted}
							onChange={(e) => setRepsCompleted(e.target.value)}
							maxLength={2000}
						/>
					</label>

					<div>
						<span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
							RPE (Rate of Perceived Exertion)
						</span>
						<div className="mt-2 flex gap-1.5 flex-wrap">
							{Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
								<button
									key={n}
									type="button"
									onClick={() => setRpe(rpe === n ? null : n)}
									className={`w-9 h-9 rounded-xl text-sm font-bold transition-colors ${
										rpe === n
											? "bg-primary text-primary-foreground"
											: "border border-border bg-background hover:bg-muted"
									}`}
								>
									{n}
								</button>
							))}
						</div>
						<p className="mt-1 text-[10px] text-muted-foreground">1 = very easy · 10 = maximal effort</p>
					</div>

					<div>
						<span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
							Upload Video (optional)
						</span>
						{videoPreview ? (
							<div className="mt-2 relative">
								<video
									className="w-full rounded-xl border border-border aspect-video object-cover"
									src={videoPreview}
									controls
									playsInline
									muted
								/>
								<button
									type="button"
									onClick={removeVideo}
									className="absolute top-2 right-2 p-1 bg-black/60 rounded-full text-white hover:bg-black/80"
								>
									<X className="w-4 h-4" />
								</button>
							</div>
						) : (
							<button
								type="button"
								onClick={() => fileInputRef.current?.click()}
								className="mt-2 w-full py-6 rounded-xl border-2 border-dashed border-border bg-background hover:bg-muted/50 transition-colors flex flex-col items-center gap-2 text-muted-foreground"
							>
								<Video className="w-8 h-8" />
								<span className="text-xs font-semibold">Tap to upload or record video</span>
								<span className="text-[10px]">MP4, MOV up to 200MB</span>
							</button>
						)}
						<input
							ref={fileInputRef}
							type="file"
							accept="video/*"
							capture="environment"
							onChange={handleVideoSelect}
							className="hidden"
						/>
						{uploadError && <p className="mt-1 text-xs text-red-500">{uploadError}</p>}
						{uploading && (
							<div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
								<div className="h-full bg-primary transition-all" style={{ width: `${uploadProgress}%` }} />
							</div>
						)}
					</div>
				</div>

				<button
					type="button"
					disabled={busy}
					onClick={handleSubmit}
					className="mt-6 w-full h-12 rounded-full bg-primary text-primary-foreground font-bold text-sm uppercase tracking-wider disabled:opacity-60 transition-opacity"
				>
					{uploading ? `Uploading ${uploadProgress}%…` : submitting ? "Submitting…" : "Mark Complete"}
				</button>
			</div>
		</div>
	);
}

function AssignedSessionDetailPage() {
	const { sessionId } = Route.useParams();
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const { token, loading: portalLoading, error: portalError } = usePortal();

	const sessionIdNumber = Number(sessionId);
	const [sheetOpen, setSheetOpen] = useState(false);
	const [completed, setCompleted] = useState(false);

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

	const completeMutation = useMutation({
		mutationFn: (data: { weightsUsed: string; repsCompleted: string; rpe: number | null; videoUrl: string | null }) =>
			completeSession(token!, sessionIdNumber, {
				weightsUsed: data.weightsUsed || undefined,
				repsCompleted: data.repsCompleted || undefined,
				rpe: data.rpe ?? undefined,
			}),
		onSuccess: () => {
			setSheetOpen(false);
			setCompleted(true);
			queryClient.invalidateQueries({ queryKey: programKeys.all });
		},
	});

	const handleComplete = useCallback(
		(data: { weightsUsed: string; repsCompleted: string; rpe: number | null; videoUrl: string | null }) => {
			completeMutation.mutate(data);
		},
		[completeMutation],
	);

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

			{exercises.length > 0 && !completed && (
				<div className="flex justify-center pt-4 pb-8">
					<button
						type="button"
						onClick={() => setSheetOpen(true)}
						className="inline-flex items-center gap-2 rounded-full bg-primary px-8 py-3 text-sm font-bold uppercase tracking-wider text-primary-foreground shadow-lg hover:opacity-90 transition-opacity"
					>
						<CheckCircle className="w-5 h-5" />
						Complete Session
					</button>
				</div>
			)}

			{completed && (
				<div className="flex flex-col items-center gap-3 pt-4 pb-8 animate-in fade-in duration-500">
					<CheckCircle className="w-12 h-12 text-green-500" />
					<p className="text-lg font-bold text-green-600">Session Completed!</p>
					<button
						type="button"
						onClick={() => navigate({ to: "/portal/programs" })}
						className="text-sm text-primary font-semibold hover:underline"
					>
						Back to Programs
					</button>
				</div>
			)}

			<CompletionSheet
				open={sheetOpen}
				onClose={() => setSheetOpen(false)}
				onSubmit={handleComplete}
				submitting={completeMutation.isPending}
			/>

			{completeMutation.isError && (
				<p className="text-center text-sm text-red-500 pb-4">
					{completeMutation.error instanceof Error
						? completeMutation.error.message
						: "Failed to complete session."}
				</p>
			)}
		</div>
	);
}
