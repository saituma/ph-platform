import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useRef, useEffect } from "react";
import { Send, MessageCircle, Plus, X, ChevronLeft, CheckCircle2, Clock } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { io, type Socket } from "socket.io-client";
import { api } from "#/lib/api-client";
import { cn } from "#/lib/utils";

export const Route = createFileRoute("/_app/messages")({
	component: FeedbackPage,
});

type Reply = {
	id: number;
	content: string;
	createdAt: string;
	senderId: number;
	senderName: string;
	senderRole: string;
};

type Thread = {
	id: number;
	subject: string;
	status: "open" | "resolved";
	createdAt: string;
	updatedAt: string;
	replies?: Reply[];
};

let socket: Socket | null = null;
function getSocket(): Socket {
	if (!socket) {
		// The parent app's Vercel config proxies /socket.io/* to the API, making this
		// effectively same-origin. The ph_app_session httpOnly cookie authenticates the socket.
		socket = io("/", {
			withCredentials: true,
			transports: ["websocket"],
		});
	}
	return socket;
}

function FeedbackPage() {
	const queryClient = useQueryClient();
	const [activeId, setActiveId] = useState<number | null>(null);
	const [composing, setComposing] = useState(false);
	const [subject, setSubject] = useState("");
	const [message, setMessage] = useState("");
	const [reply, setReply] = useState("");
	const bottomRef = useRef<HTMLDivElement>(null);

	const { data: listData, isLoading, isError: listError } = useQuery<{ threads: Thread[] }>({
		queryKey: ["feedback-list"],
		queryFn: () => api.get<{ threads: Thread[] }>("/api/portal/guardian/feedback"),
	});

	const { data: threadData } = useQuery<Thread>({
		queryKey: ["feedback-thread", activeId],
		queryFn: () => api.get<Thread>(`/api/portal/guardian/feedback/${activeId}`),
		enabled: !!activeId,
	});

	// Real-time: listen for coach replies on this thread
	useEffect(() => {
		const s = getSocket();
		const handler = ({ feedbackId }: { feedbackId: number }) => {
			queryClient.invalidateQueries({ queryKey: ["feedback-thread", feedbackId] });
			queryClient.invalidateQueries({ queryKey: ["feedback-list"] });
		};
		s.on("guardian:feedback:reply", handler);
		return () => { s.off("guardian:feedback:reply", handler); };
	}, [queryClient]);

	useEffect(() => {
		bottomRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [threadData?.replies]);

	const createThread = useMutation({
		mutationFn: () => api.post<Thread>("/api/portal/guardian/feedback", { subject: subject.trim(), message: message.trim() }),
		onSuccess: (thread) => {
			queryClient.invalidateQueries({ queryKey: ["feedback-list"] });
			setComposing(false);
			setSubject("");
			setMessage("");
			setActiveId(thread.id);
		},
		onError: () => toast.error("Failed to send feedback"),
	});

	const sendReply = useMutation({
		mutationFn: () => api.post(`/api/portal/guardian/feedback/${activeId}/reply`, { message: reply.trim() }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["feedback-thread", activeId] });
			queryClient.invalidateQueries({ queryKey: ["feedback-list"] });
			setReply("");
		},
		onError: () => toast.error("Failed to send reply"),
	});

	const threads = listData?.threads ?? [];
	const activeThread = threadData;

	return (
		<div className="flex h-full overflow-hidden">
			{/* Thread list */}
			<div className={cn(
				"w-full sm:w-72 lg:w-80 flex-shrink-0 border-r border-border flex flex-col",
				activeId && !composing ? "hidden sm:flex" : "flex",
			)}>
				<div className="flex items-center justify-between px-4 py-3.5 border-b border-border">
					<div>
						<p className="label-mono">Parent Feedback</p>
						<p className="text-[10px] text-muted-foreground font-mono mt-0.5">Direct line to your coach</p>
					</div>
					<button
						type="button"
						onClick={() => { setComposing(true); setActiveId(null); }}
						className="w-7 h-7 bg-primary text-primary-foreground flex items-center justify-center hover:opacity-90 transition-opacity"
					>
						<Plus size={13} />
					</button>
				</div>

				<div className="flex-1 overflow-y-auto">
					{isLoading ? (
						<div className="p-4 space-y-3">
							{[1, 2].map((i) => <div key={i} className="h-16 bg-muted animate-pulse" />)}
						</div>
					) : listError ? (
						<div className="p-8 text-center">
							<MessageCircle size={28} className="mx-auto text-muted-foreground/20 mb-3" />
							<p className="text-sm text-muted-foreground font-mono">Failed to load feedback</p>
							<p className="text-xs text-muted-foreground/60 font-mono mt-1">Check your connection and try again</p>
						</div>
					) : threads.length === 0 ? (
						<div className="p-8 text-center">
							<MessageCircle size={28} className="mx-auto text-muted-foreground/20 mb-3" />
							<p className="text-sm text-muted-foreground font-mono">No feedback yet</p>
							<p className="text-xs text-muted-foreground/60 font-mono mt-1">Tap + to send your first message</p>
						</div>
					) : (
						threads.map((t) => (
							<button
								key={t.id}
								type="button"
								onClick={() => { setActiveId(t.id); setComposing(false); }}
								className={cn(
									"w-full flex items-start gap-3 px-4 py-3.5 text-left hover:bg-muted/30 transition-colors border-b border-border/50",
									activeId === t.id && "bg-primary/5 border-l-2 border-l-primary",
								)}
							>
								<div className="mt-0.5 flex-shrink-0">
									{t.status === "resolved"
										? <CheckCircle2 size={14} className="text-primary" />
										: <Clock size={14} className="text-amber-500" />}
								</div>
								<div className="flex-1 min-w-0">
									<div className="flex items-center justify-between gap-1">
										<span className="text-sm font-bold text-foreground truncate">{t.subject}</span>
										<span className="text-[10px] text-muted-foreground font-mono flex-shrink-0">
											{format(new Date(t.updatedAt), "d MMM")}
										</span>
									</div>
									<span className={cn(
										"text-[10px] font-mono uppercase tracking-wider mt-0.5",
										t.status === "resolved" ? "text-primary" : "text-amber-500",
									)}>
										{t.status}
									</span>
								</div>
							</button>
						))
					)}
				</div>
			</div>

			{/* Compose new thread */}
			{composing && (
				<div className="flex-1 flex flex-col min-w-0">
					<div className="flex items-center justify-between px-4 py-3.5 border-b border-border flex-shrink-0">
						<div>
							<p className="font-bold text-sm text-foreground uppercase tracking-wide">New Feedback</p>
							<p className="text-xs text-muted-foreground font-mono">Your coach will respond shortly</p>
						</div>
						<button type="button" onClick={() => setComposing(false)} className="text-muted-foreground hover:text-foreground transition-colors">
							<X size={16} />
						</button>
					</div>
					<div className="flex-1 p-5 space-y-4">
						<div className="space-y-2">
							<label className="label-mono block">Subject</label>
							<input
								value={subject}
								onChange={(e) => setSubject(e.target.value)}
								placeholder="e.g. Question about training schedule"
								maxLength={255}
								className="w-full px-3.5 py-2.5 border border-input bg-background text-foreground text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring transition-all"
							/>
						</div>
						<div className="space-y-2">
							<label className="label-mono block">Message</label>
							<textarea
								value={message}
								onChange={(e) => setMessage(e.target.value)}
								rows={6}
								maxLength={2000}
								placeholder="Write your message to the coach…"
								className="w-full px-3.5 py-2.5 border border-input bg-background text-foreground text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring resize-none leading-relaxed transition-all"
							/>
						</div>
						<button
							type="button"
							onClick={() => createThread.mutate()}
							disabled={subject.trim().length < 2 || !message.trim() || createThread.isPending}
							className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground text-xs font-bold uppercase tracking-widest hover:opacity-90 transition-opacity disabled:opacity-50"
						>
							<Send size={12} /> {createThread.isPending ? "Sending…" : "Send feedback"}
						</button>
					</div>
				</div>
			)}

			{/* Thread view */}
			{!composing && activeId && (
				<div className="flex-1 flex flex-col min-w-0">
					<div className="flex items-center gap-3 px-4 py-3.5 border-b border-border flex-shrink-0">
						<button type="button" onClick={() => setActiveId(null)} className="sm:hidden text-muted-foreground hover:text-foreground transition-colors">
							<ChevronLeft size={18} />
						</button>
						<div className="flex-1 min-w-0">
							<div className="font-bold text-sm text-foreground uppercase tracking-wide truncate">
								{activeThread?.subject ?? "…"}
							</div>
							<div className="flex items-center gap-2 mt-0.5">
								<span className={cn(
									"text-[10px] font-mono uppercase tracking-wider",
									activeThread?.status === "resolved" ? "text-primary" : "text-amber-500",
								)}>
									{activeThread?.status ?? "open"}
								</span>
								<span className="text-[10px] text-muted-foreground/40 font-mono">·</span>
								<span className="text-[10px] text-muted-foreground font-mono">Coach feedback thread</span>
							</div>
						</div>
					</div>

					<div className="flex-1 overflow-y-auto p-4 space-y-3">
						{(activeThread?.replies ?? []).map((r) => {
							const isOwn = r.senderRole === "guardian";
							return (
								<div key={r.id} className={cn("flex", isOwn ? "justify-end" : "justify-start")}>
									<div className={cn(
										"max-w-[78%] px-4 py-3",
										isOwn ? "bg-primary text-primary-foreground" : "bg-muted text-foreground border border-border",
									)}>
										{!isOwn && (
											<div className="text-[10px] font-bold mb-1.5 opacity-60 font-mono uppercase tracking-wide">
												{r.senderName}
											</div>
										)}
										<p className="text-sm leading-relaxed">{r.content}</p>
										<div className={cn("text-[10px] mt-1.5 opacity-50 font-mono", isOwn ? "text-right" : "text-left")}>
											{format(new Date(r.createdAt), "d MMM · HH:mm")}
										</div>
									</div>
								</div>
							);
						})}
						<div ref={bottomRef} />
					</div>

					{activeThread?.status !== "resolved" && (
						<form
							onSubmit={(e) => { e.preventDefault(); if (reply.trim()) sendReply.mutate(); }}
							className="flex items-end gap-2 px-4 py-3 border-t border-border flex-shrink-0"
						>
							<textarea
								value={reply}
								onChange={(e) => setReply(e.target.value)}
								onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if (reply.trim()) sendReply.mutate(); } }}
								rows={2}
								placeholder="Reply to your coach… (Enter to send)"
								className="flex-1 px-3.5 py-2 border border-input bg-background text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring text-sm resize-none transition-all"
							/>
							<button
								type="submit"
								disabled={!reply.trim() || sendReply.isPending}
								className="w-9 h-9 bg-primary text-primary-foreground flex items-center justify-center hover:opacity-90 disabled:opacity-50 transition-opacity flex-shrink-0 self-end"
							>
								<Send size={14} />
							</button>
						</form>
					)}
					{activeThread?.status === "resolved" && (
						<div className="px-4 py-3 border-t border-border text-center">
							<p className="text-xs text-muted-foreground font-mono flex items-center justify-center gap-1.5">
								<CheckCircle2 size={11} className="text-primary" /> This thread has been resolved by your coach
							</p>
						</div>
					)}
				</div>
			)}

			{/* Empty state when nothing selected */}
			{!composing && !activeId && (
				<div className="hidden sm:flex flex-1 items-center justify-center">
					<div className="text-center space-y-3">
						<MessageCircle size={40} className="mx-auto text-muted-foreground/15" />
						<p className="text-sm text-muted-foreground font-mono">Select a thread or start new feedback</p>
					</div>
				</div>
			)}
		</div>
	);
}
