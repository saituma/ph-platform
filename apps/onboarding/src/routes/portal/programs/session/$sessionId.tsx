import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
	ArrowLeft,
	CheckCircle,
	ExternalLink,
	Info,
	Loader2,
	PlayCircle,
	Video,
} from "lucide-react";
import { toast } from "sonner";
import { config } from "@/lib/config";
import { getClientAuthToken } from "@/lib/client-storage";
import { usePortal } from "@/portal/PortalContext";
import { fetchTeamWorkspace } from "@/services/programsService";
import { programKeys } from "../index";

export const Route = createFileRoute("/portal/programs/session/$sessionId")({
	loader: async ({ context: { queryClient } }) => {
		const token = getClientAuthToken();
		if (token) {
			await queryClient.ensureQueryData({
				queryKey: programKeys.workspace(token, null),
				queryFn: () => fetchTeamWorkspace(token, null),
			});
		}
	},
	component: SessionDetailPage,
});

type VideoSource =
	| { kind: "youtube"; embedUrl: string }
	| { kind: "loom"; embedUrl: string }
	| { kind: "html5"; videoUrl: string }
	| { kind: "unknown"; url: string };

const EMPTY_VTT_CAPTIONS = "data:text/vtt,WEBVTT%0A%0A";

type SessionItemMetadata = {
	sets?: number;
	reps?: number;
	duration?: number;
	restSeconds?: number;
};

type SessionItem = {
	id: number | string;
	title: string;
	body?: string | null;
	videoUrl?: string | null;
	metadata?: SessionItemMetadata | null;
};

type TrainingSession = {
	id: number;
	order: number;
	title: string;
	completed?: boolean;
	items?: SessionItem[];
};

type TrainingModule = {
	id: number;
	title: string;
	sessions: TrainingSession[];
};

function normalizeVideoSource(rawUrl: string): VideoSource {
	const url = rawUrl.trim();
	if (!url) return { kind: "unknown", url: rawUrl };

	// YouTube direct ID
	if (!url.startsWith("http") && /^[a-zA-Z0-9_-]{11}$/.test(url)) {
		return { kind: "youtube", embedUrl: toYouTubeEmbedUrl(url) };
	}

	// Blob/data URLs (e.g. local uploads)
	if (url.startsWith("blob:") || url.startsWith("data:")) {
		return { kind: "html5", videoUrl: url };
	}

	// Common file types
	if (/\.(mp4|webm|ogg|mov|m4v)(\?|#|$)/i.test(url)) {
		return { kind: "html5", videoUrl: url };
	}

	const parsed = safeParseUrl(url);
	if (!parsed) return { kind: "unknown", url };

	const host = parsed.hostname.replace(/^www\./, "");
	const path = parsed.pathname;

	if (host === "youtu.be") {
		const id = path.split("/").filter(Boolean)[0] ?? "";
		if (id) return { kind: "youtube", embedUrl: toYouTubeEmbedUrl(id) };
	}

	if (host.endsWith("youtube.com")) {
		// /watch?v=ID
		const v = parsed.searchParams.get("v");
		if (v) return { kind: "youtube", embedUrl: toYouTubeEmbedUrl(v) };

		// /embed/ID
		const embedMatch = path.match(/^\/embed\/([^/]+)/);
		if (embedMatch?.[1])
			return { kind: "youtube", embedUrl: toYouTubeEmbedUrl(embedMatch[1]) };

		// /shorts/ID
		const shortsMatch = path.match(/^\/shorts\/([^/]+)/);
		if (shortsMatch?.[1])
			return { kind: "youtube", embedUrl: toYouTubeEmbedUrl(shortsMatch[1]) };
	}

	if (host === "loom.com") {
		// /share/ID or /embed/ID
		const shareMatch = path.match(/^\/share\/([^/]+)/);
		const embedMatch = path.match(/^\/embed\/([^/]+)/);
		const id = shareMatch?.[1] ?? embedMatch?.[1] ?? "";
		if (id) return { kind: "loom", embedUrl: toLoomEmbedUrl(id) };
	}

	// If it looks like a video file after redirects or signed URLs
	if (/\.(mp4|webm|ogg|mov|m4v)(\?|#|$)/i.test(parsed.pathname)) {
		return { kind: "html5", videoUrl: parsed.toString() };
	}

	return { kind: "unknown", url: parsed.toString() };
}

function safeParseUrl(raw: string): URL | null {
	const base =
		typeof window !== "undefined" ? window.location.origin : "http://localhost";
	try {
		return new URL(raw, base);
	} catch {
		try {
			return new URL(`https://${raw}`);
		} catch {
			return null;
		}
	}
}

function toYouTubeEmbedUrl(videoId: string) {
	const id = videoId.trim();
	return `https://www.youtube.com/embed/${encodeURIComponent(id)}?rel=0&modestbranding=1`;
}

function toLoomEmbedUrl(videoId: string) {
	const id = videoId.trim();
	return `https://www.loom.com/embed/${encodeURIComponent(id)}`;
}

function VideoPlayer({ videoUrl }: { videoUrl: string }) {
	const source = normalizeVideoSource(videoUrl);

	if (source.kind === "youtube" || source.kind === "loom") {
		return (
			<iframe
				src={source.embedUrl}
				className="w-full h-full"
				allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
				allowFullScreen
				referrerPolicy="strict-origin-when-cross-origin"
				title="Training video"
			/>
		);
	}

	if (source.kind === "html5") {
		return (
			<video className="w-full h-full" controls playsInline preload="metadata">
				<source src={source.videoUrl} />
				<track
					kind="captions"
					src={EMPTY_VTT_CAPTIONS}
					srcLang="en"
					label="Captions"
				/>
				Your browser does not support the video tag.
			</video>
		);
	}

	return (
		<div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground gap-3 p-6">
			<Video className="w-12 h-12 opacity-20" />
			<p className="text-sm font-medium text-center">
				Video link can’t be embedded. Open it in a new tab.
			</p>
			<a
				href={source.url}
				target="_blank"
				rel="noreferrer"
				className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-primary hover:underline"
			>
				Open video <ExternalLink className="w-4 h-4" />
			</a>
		</div>
	);
}

function SessionDetailPage() {
	const { sessionId } = Route.useParams();
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const {
		token,
		age,
		loading: portalLoading,
		error: portalError,
	} = usePortal();

	const sessionIdNumber = Number(sessionId);

	const {
		data: workspace,
		isLoading: programsLoading,
		error: programsError,
	} = useQuery({
		queryKey: programKeys.workspace(token, age),
		queryFn: () => fetchTeamWorkspace(token!, age),
		enabled: !!token && !portalLoading,
		staleTime: 1000 * 60 * 15,
	});

	const modules = (workspace?.modules ?? []) as TrainingModule[];
	const allSessions = modules.flatMap((m) => m.sessions ?? []);
	const session = allSessions.find((s) => s.id === sessionIdNumber);
	const parentModule = modules.find((m) =>
		m.sessions?.some((s) => s.id === sessionIdNumber),
	);

	const finishMutation = useMutation({
		mutationFn: async () => {
			const baseUrl = config.api.baseUrl;
			const response = await fetch(
				`${baseUrl}/api/training-content-v2/mobile/sessions/${sessionId}/finish`,
				{
					method: "POST",
					headers: {
						Authorization: `Bearer ${token}`,
						"Content-Type": "application/json",
					},
				},
			);

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.error || "Failed to finish session");
			}
			return response.json();
		},
		onSuccess: () => {
			toast.success("Session completed!", {
				description: "Your progress has been saved.",
			});
			queryClient.invalidateQueries({
				queryKey: programKeys.workspace(token, age),
			});

			if (parentModule) {
				navigate({
					to: "/portal/programs/module/$moduleId",
					params: { moduleId: String(parentModule.id) },
				});
			} else {
				navigate({ to: "/portal/programs" });
			}
		},
		onError: (err) => {
			toast.error("Error", {
				description:
					err instanceof Error ? err.message : "Failed to finish session",
			});
		},
	});

	if (portalLoading || (token && programsLoading && !workspace)) {
		return (
			<div className="flex h-screen items-center justify-center pb-20">
				<div className="text-center">
					<div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
					<p className="mt-4 text-sm text-muted-foreground">
						Loading session details...
					</p>
				</div>
			</div>
		);
	}

	if (portalError || programsError || !session) {
		return (
			<div className="flex h-screen items-center justify-center pb-20 px-4">
				<div className="text-center">
					<p className="text-muted-foreground mb-4">
						{portalError ||
							(programsError instanceof Error
								? programsError.message
								: "Session not found")}
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
		<div className="container mx-auto p-4 pb-32 space-y-8">
			<div className="flex items-center justify-between gap-4">
				<div className="flex items-center gap-4">
					<button
						type="button"
						onClick={() => {
							if (parentModule) {
								navigate({
									to: "/portal/programs/module/$moduleId",
									params: { moduleId: String(parentModule.id) },
								});
							} else {
								navigate({ to: "/portal/programs" });
							}
						}}
						className="p-2 hover:bg-muted rounded-full transition-colors"
					>
						<ArrowLeft className="w-6 h-6" />
					</button>
					<div>
						<p className="text-[10px] font-black uppercase tracking-widest text-primary/60">
							{parentModule?.title || "Training Session"}
						</p>
						<h1 className="text-2xl font-black italic uppercase tracking-tight">
							{session.order}.{" "}
							<span className="text-primary">{session.title}</span>
						</h1>
					</div>
				</div>

				{session.completed && (
					<div className="flex items-center gap-2 px-3 py-1 bg-green-500/10 text-green-500 rounded-full text-[10px] font-black uppercase tracking-widest">
						<CheckCircle className="w-3 h-3" />
						Completed
					</div>
				)}
			</div>

			<div className="space-y-12">
				{session.items?.map((item, idx) => (
					<div
						key={item.id}
						className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500"
						style={{ animationDelay: `${idx * 100}ms` }}
					>
						<div className="flex items-start justify-between gap-4">
							<h2 className="text-xl font-bold uppercase italic border-l-4 border-primary pl-4">
								{item.title}
							</h2>
						</div>

						<div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
							{/* Video Section */}
							{item.videoUrl ? (
								<div className="aspect-video rounded-3xl overflow-hidden bg-black shadow-2xl ring-1 ring-border/50 group relative">
									<VideoPlayer videoUrl={item.videoUrl} />
								</div>
							) : (
								<div className="aspect-video rounded-3xl bg-muted/30 flex flex-col items-center justify-center border-2 border-dashed border-border text-muted-foreground gap-3">
									<Video className="w-12 h-12 opacity-20" />
									<p className="text-sm font-medium">No video available</p>
								</div>
							)}

							{/* Content & Metadata */}
							<div className="space-y-6">
								<div className="bg-card border rounded-3xl p-6 md:p-8 shadow-sm">
									<h3 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground mb-4 flex items-center gap-2">
										<Info className="w-3 h-3" />
										Instruction
									</h3>
									<div className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground leading-relaxed whitespace-pre-wrap">
										{item.body}
									</div>
								</div>

								{item.metadata && Object.keys(item.metadata).length > 0 && (
									<div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
										{item.metadata.sets && (
											<div className="bg-primary/5 border border-primary/10 rounded-2xl p-4 text-center">
												<p className="text-[10px] font-black uppercase tracking-widest text-primary/60 mb-1">
													Sets
												</p>
												<p className="text-xl font-black text-primary">
													{item.metadata.sets}
												</p>
											</div>
										)}
										{item.metadata.reps && (
											<div className="bg-primary/5 border border-primary/10 rounded-2xl p-4 text-center">
												<p className="text-[10px] font-black uppercase tracking-widest text-primary/60 mb-1">
													Reps
												</p>
												<p className="text-xl font-black text-primary">
													{item.metadata.reps}
												</p>
											</div>
										)}
										{item.metadata.duration && (
											<div className="bg-primary/5 border border-primary/10 rounded-2xl p-4 text-center">
												<p className="text-[10px] font-black uppercase tracking-widest text-primary/60 mb-1">
													Duration
												</p>
												<p className="text-xl font-black text-primary">
													{item.metadata.duration}s
												</p>
											</div>
										)}
										{item.metadata.restSeconds && (
											<div className="bg-primary/5 border border-primary/10 rounded-2xl p-4 text-center">
												<p className="text-[10px] font-black uppercase tracking-widest text-primary/60 mb-1">
													Rest
												</p>
												<p className="text-xl font-black text-primary">
													{item.metadata.restSeconds}s
												</p>
											</div>
										)}
									</div>
								)}
							</div>
						</div>
					</div>
				))}

				{(!session.items || session.items.length === 0) && (
					<div className="py-20 text-center border-2 border-dashed rounded-[3rem] bg-muted/5">
						<p className="text-muted-foreground font-medium italic">
							No exercises or content defined for this session.
						</p>
					</div>
				)}
			</div>

			{/* Floating Action Bar */}
			<div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-background via-background to-transparent pointer-events-none">
				<div className="max-w-4xl mx-auto pointer-events-auto">
					<button
						type="button"
						disabled={session.completed || finishMutation.isPending}
						onClick={() => finishMutation.mutate()}
						className={`w-full h-16 rounded-2xl text-lg font-black uppercase italic tracking-tight transition-all shadow-2xl flex items-center justify-center gap-3 ${
							session.completed
								? "bg-green-500 text-white cursor-default"
								: "bg-primary text-primary-foreground hover:scale-[1.02] active:scale-[0.98] shadow-primary/20"
						}`}
					>
						{finishMutation.isPending ? (
							<Loader2 className="w-6 h-6 animate-spin" />
						) : session.completed ? (
							<>
								<CheckCircle className="w-6 h-6" />
								Session Finished
							</>
						) : (
							<>
								<PlayCircle className="w-6 h-6 fill-current" />
								Finish Training Session
							</>
						)}
					</button>
				</div>
			</div>
		</div>
	);
}
