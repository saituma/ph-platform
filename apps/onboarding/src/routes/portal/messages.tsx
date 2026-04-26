import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
	ArrowLeft,
	Loader2,
	MessageSquare,
	Paperclip,
	Plus,
	Search,
	Send,
	Shield,
	User,
	Users,
	X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { getClientAuthToken } from "@/lib/client-storage";
import { getPublicApiBaseUrl } from "@/lib/public-api";
import { isPortalTeamRosterManagerRole } from "@/lib/portal-roles";
import { cn } from "@/lib/utils";
import { usePortal } from "@/portal/PortalContext";
import {
	type ApiChatMessage,
	fetchInbox,
	fetchThreadMessages,
	parseReplyPrefix,
	sendMessage,
	toggleMessageReaction,
	uploadMessageAttachment,
} from "@/services/messagesService";
import { messageKeys } from "@/lib/portal-messages-keys";

export const Route = createFileRoute("/portal/messages")({
	loader: async ({ context: { queryClient } }) => {
		const token = getClientAuthToken();
		if (token) {
			await queryClient.ensureQueryData({
				queryKey: messageKeys.inbox(token),
				queryFn: () => fetchInbox(token),
			});
		}
	},
	component: MessagesPage,
});

function isOwnThreadMessage(params: {
	msg: {
		senderId?: number | string | null;
		senderUserKey?: string | null;
		receiverId?: number | string | null;
		senderName?: string | null;
	};
	currentUserId?: number | string | null;
	currentUserKey?: string | null;
	currentUserName?: string | null;
	threadId?: string | null;
}) {
	const senderId = Number(params.msg.senderId ?? Number.NaN);
	const receiverId = Number(params.msg.receiverId ?? Number.NaN);
	const userId = Number(params.currentUserId ?? Number.NaN);

	if (Number.isFinite(userId) && Number.isFinite(senderId)) {
		return senderId === userId;
	}

	const [threadType, rawPeerId] = String(params.threadId ?? "").split(":");
	const peerId = Number(rawPeerId ?? Number.NaN);
	const senderName = String(params.msg.senderName ?? "")
		.trim()
		.toLowerCase();
	const currentUserName = String(params.currentUserName ?? "")
		.trim()
		.toLowerCase();
	const senderUserKey = String(params.msg.senderUserKey ?? "").trim();
	const currentUserKey = String(params.currentUserKey ?? "").trim();

	if (senderUserKey && currentUserKey) {
		return senderUserKey === currentUserKey;
	}

	// Group messages can be fetched through acting-user contexts where senderId
	// is not reliable for ownership. If names differ, treat as incoming.
	if (threadType === "group" && senderName && currentUserName) {
		return senderName === currentUserName;
	}

	if (
		(threadType === "coach" || threadType === "admin") &&
		Number.isFinite(peerId) &&
		Number.isFinite(senderId)
	) {
		return senderId !== peerId;
	}

	if (
		(threadType === "coach" || threadType === "admin") &&
		Number.isFinite(peerId) &&
		Number.isFinite(receiverId)
	) {
		return receiverId === peerId;
	}

	return false;
}

function MessagesPage() {
	const { token, user, loading: portalLoading } = usePortal();
	const isManager = isPortalTeamRosterManagerRole(user?.role);
	const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
	const [newMessage, setNewMessage] = useState("");
	const [attachedFile, setAttachedFile] = useState<File | null>(null);
	const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const scrollRef = useRef<HTMLDivElement>(null);
	const activeThreadIdRef = useRef<string | null>(null);
	const queryClient = useQueryClient();
	const reactionOptions = ["👍", "🔥", "💪", "👏", "❤️"];

	useEffect(() => {
		activeThreadIdRef.current = activeThreadId;
	}, [activeThreadId]);

	const { data: inboxData, isLoading: threadsLoading } = useQuery({
		queryKey: messageKeys.inbox(token, isManager),
		queryFn: () => {
			if (!token) throw new Error("Missing auth token");
			return fetchInbox(token, isManager);
		},
		enabled: !!token && !portalLoading,
		staleTime: 1000 * 60, // 1 minute
	});

	const threads = inboxData?.threads ?? [];

	useEffect(() => {
		if (threads.length > 0 && !activeThreadId) {
			setActiveThreadId(threads[0].id);
		}
	}, [threads, activeThreadId]);

	const { data: messages = [], isLoading: messagesLoading } = useQuery({
		queryKey: messageKeys.thread(token, activeThreadId),
		queryFn: async () => {
			if (!token || !activeThreadId) return [];
			const msgs = await fetchThreadMessages(token, activeThreadId);
			// API returns chronological (oldest → newest). Keep that so latest appears at the bottom.
			return [...msgs].sort(
				(a, b) =>
					new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
			);
		},
		enabled: !!token && !!activeThreadId,
		staleTime: 1000 * 30, // 30 seconds
	});

	const sendMutation = useMutation({
		mutationFn: (payload: {
			content: string;
			contentType?: "text" | "image" | "video";
			mediaUrl?: string;
		}) => {
			if (!token || !activeThreadId) throw new Error("Missing active thread");
			return sendMessage(token, activeThreadId, payload);
		},
		onMutate: async (payload: {
			content: string;
			contentType?: "text" | "image" | "video";
			mediaUrl?: string;
		}) => {
			if (!token || !activeThreadId) return null;
			const threadKey = messageKeys.thread(token, activeThreadId);
			await queryClient.cancelQueries({ queryKey: threadKey });
			const previousMessages =
				queryClient.getQueryData<ApiChatMessage[]>(threadKey) ?? [];
			const optimisticMessage: ApiChatMessage = {
				id: -Date.now(),
				messageKey: `optimistic:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`,
				senderId: Number(user?.id ?? 0),
				content: payload.content,
				contentType: payload.contentType ?? "text",
				mediaUrl: payload.mediaUrl,
				read: true,
				createdAt: new Date().toISOString(),
			};
			queryClient.setQueryData<ApiChatMessage[]>(threadKey, [
				...previousMessages,
				optimisticMessage,
			]);
			setNewMessage("");
			setAttachedFile(null);
			return { threadKey, previousMessages, draft: payload.content };
		},
		onError: (_error, _text, ctx) => {
			if (!ctx) return;
			queryClient.setQueryData<ApiChatMessage[]>(
				ctx.threadKey,
				ctx.previousMessages,
			);
			setNewMessage(ctx.draft);
		},
		onSettled: (_data, _error, _text, ctx) => {
			if (ctx?.threadKey) {
				queryClient.invalidateQueries({ queryKey: ctx.threadKey });
			}
			queryClient.invalidateQueries({
				queryKey: messageKeys.inbox(token, isManager),
			});
		},
	});

	const reactionMutation = useMutation({
		mutationFn: (payload: { messageId: number; emoji: string }) => {
			if (!token || !activeThreadId) throw new Error("Missing active thread");
			return toggleMessageReaction(
				token,
				activeThreadId,
				payload.messageId,
				payload.emoji,
			);
		},
		onMutate: async (payload: { messageId: number; emoji: string }) => {
			if (!token || !activeThreadId) return null;
			const threadKey = messageKeys.thread(token, activeThreadId);
			await queryClient.cancelQueries({ queryKey: threadKey });
			const previousMessages =
				queryClient.getQueryData<ApiChatMessage[]>(threadKey) ?? [];
			const currentUserId = Number(user?.id ?? Number.NaN);
			const optimisticMessages = previousMessages.map((item) => {
				if (Number(item.id) !== payload.messageId) return item;
				const current = Array.isArray(item.reactions) ? item.reactions : [];
				const next = current.map((reaction) => ({
					...reaction,
					userIds: [...(reaction.userIds ?? [])],
				}));
				const existingIdx = next.findIndex((reaction) =>
					reaction.userIds.includes(currentUserId),
				);
				const existingEmoji =
					existingIdx >= 0 ? next[existingIdx].emoji : undefined;

				if (existingEmoji === payload.emoji) {
					const existing = next[existingIdx];
					existing.userIds = existing.userIds.filter(
						(id) => id !== currentUserId,
					);
					existing.count = existing.userIds.length;
					return {
						...item,
						reactions: next.filter((reaction) => reaction.count > 0),
					};
				}

				if (existingIdx >= 0) {
					const existing = next[existingIdx];
					existing.userIds = existing.userIds.filter(
						(id) => id !== currentUserId,
					);
					existing.count = existing.userIds.length;
				}

				const targetIdx = next.findIndex(
					(reaction) => reaction.emoji === payload.emoji,
				);
				if (targetIdx >= 0) {
					const target = next[targetIdx];
					if (!target.userIds.includes(currentUserId)) {
						target.userIds.push(currentUserId);
					}
					target.count = target.userIds.length;
				} else {
					next.push({
						emoji: payload.emoji,
						count: 1,
						userIds: [currentUserId],
					});
				}

				return {
					...item,
					reactions: next.filter((reaction) => reaction.count > 0),
				};
			});
			queryClient.setQueryData<ApiChatMessage[]>(threadKey, optimisticMessages);
			return { threadKey, previousMessages };
		},
		onError: (_error, _payload, ctx) => {
			if (!ctx) return;
			queryClient.setQueryData<ApiChatMessage[]>(
				ctx.threadKey,
				ctx.previousMessages,
			);
		},
		onSettled: (_data, _error, _payload, ctx) => {
			if (ctx?.threadKey) {
				queryClient.invalidateQueries({ queryKey: ctx.threadKey });
			}
		},
	});

	const parsedMessages = useMemo(() => {
		const byId = new Map<number, ApiChatMessage>();
		for (const item of messages) {
			byId.set(Number(item.id), item);
		}
		return messages.map((item) => {
			const parsed = parseReplyPrefix(item.content ?? "");
			const referenced = parsed.replyToMessageId
				? byId.get(Number(parsed.replyToMessageId))
				: undefined;
			const referencedParsed = referenced
				? parseReplyPrefix(referenced.content ?? "")
				: null;
			const isAttachmentPlaceholder =
				Boolean(item.mediaUrl) &&
				String(parsed.text ?? "")
					.trim()
					.toLowerCase() === "attachment";
			const displayText = isAttachmentPlaceholder ? "" : parsed.text;
			const replySnippet =
				parsed.replyPreview ||
				String(referencedParsed?.text ?? "").trim() ||
				(referenced?.mediaUrl ? "Media message" : "");
			return {
				raw: item,
				displayText,
				replyToMessageId: parsed.replyToMessageId,
				replySnippet,
			};
		});
	}, [messages]);

	useEffect(() => {
		if (scrollRef.current) {
			scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
		}
	}, [messages, activeThreadId, messagesLoading]);

	const handleSendMessage = async (e: React.FormEvent) => {
		e.preventDefault();
		if ((!newMessage.trim() && !attachedFile) || sendMutation.isPending || isUploadingAttachment) return;
		try {
			let mediaUrl: string | undefined;
			let contentType: "text" | "image" | "video" | undefined;
			if (attachedFile && token) {
				setIsUploadingAttachment(true);
				const uploaded = await uploadMessageAttachment(token, attachedFile);
				mediaUrl = uploaded.mediaUrl;
				contentType = uploaded.contentType;
			}
			const content = newMessage.trim();
			await sendMutation.mutateAsync({
				content,
				contentType: contentType ?? "text",
				mediaUrl,
			});
		} finally {
			setIsUploadingAttachment(false);
		}
	};

	const activeThread = threads.find((t) => t.id === activeThreadId);

	useEffect(() => {
		if (!token || portalLoading || typeof window === "undefined") return;

		const rawSocket = String(
			(import.meta.env as Record<string, string | undefined>)
				.VITE_PUBLIC_SOCKET_URL ?? "",
		).trim();
		const apiBase = getPublicApiBaseUrl();
		const socketUrl = rawSocket
			? rawSocket.replace(/\/api\/?$/, "")
			: apiBase
				? apiBase.replace(/\/api\/?$/, "")
				: window.location.origin;

		let loggedConnectError = false;
		const socket: Socket = io(socketUrl, {
			path: "/socket.io",
			auth: { token },
			transports: ["polling", "websocket"],
			reconnection: true,
			reconnectionDelayMax: 10000,
		});

		const invalidateInbox = () => {
			queryClient.invalidateQueries({
				queryKey: messageKeys.inbox(token, isManager),
			});
		};

		const invalidateActiveThread = () => {
			const currentThreadId = activeThreadIdRef.current;
			if (!currentThreadId) return;
			queryClient.invalidateQueries({
				queryKey: messageKeys.thread(token, currentThreadId),
			});
		};

		const isActiveDirectThreadPayload = (payload: {
			senderId?: number | string | null;
			receiverId?: number | string | null;
		}) => {
			const currentThreadId = activeThreadIdRef.current;
			if (!currentThreadId) return false;
			const [threadType, rawPeerId] = currentThreadId.split(":");
			if (threadType !== "coach" && threadType !== "admin") return false;
			const peerId = Number(rawPeerId ?? Number.NaN);
			const senderId = Number(payload.senderId ?? Number.NaN);
			const receiverId = Number(payload.receiverId ?? Number.NaN);
			if (!Number.isFinite(peerId)) return false;
			return senderId === peerId || receiverId === peerId;
		};

		const catchUp = () => {
			invalidateInbox();
			invalidateActiveThread();
		};

		socket.on("connect", () => {
			catchUp();
		});

		socket.on("connect_error", (err) => {
			if (!import.meta.env.DEV || loggedConnectError) return;
			loggedConnectError = true;
			const code =
				(err as { data?: { code?: string } } | undefined)?.data?.code ?? "";
			const retryAfter =
				(err as { data?: { retryAfterSeconds?: number } } | undefined)?.data
					?.retryAfterSeconds;
			if (code === "DB_UNAVAILABLE") {
				console.warn(
					"[portal/messages] socket connect_error: DB unavailable",
					`url=${socketUrl} retryAfterSeconds=${retryAfter ?? "unknown"} — API is up but database is temporarily unavailable.`,
				);
				return;
			}
			console.warn(
				"[portal/messages] socket connect_error:",
				err?.message ?? err,
				`url=${socketUrl} — ensure the API (Socket.IO) is running; if this is a browser-network failure, verify backend availability and CORS for ${typeof window !== "undefined" ? window.location.origin : ""}.`,
			);
		});

		socket.on(
			"message:new",
			(payload: {
				senderId?: number | string;
				receiverId?: number | string;
			}) => {
				invalidateInbox();
				if (isActiveDirectThreadPayload(payload)) {
					invalidateActiveThread();
				}
			},
		);

		socket.on(
			"message:read",
			(payload: {
				readerUserId?: number | string;
				peerUserIds?: Array<number | string>;
			}) => {
				invalidateInbox();
				const currentThreadId = activeThreadIdRef.current;
				if (!currentThreadId) return;
				const [threadType, rawPeerId] = currentThreadId.split(":");
				if (threadType !== "coach" && threadType !== "admin") return;
				const peerId = Number(rawPeerId ?? Number.NaN);
				const readerUserId = Number(payload?.readerUserId ?? Number.NaN);
				const peerUserIds = Array.isArray(payload?.peerUserIds)
					? payload.peerUserIds
							.map((id: unknown) => Number(id))
							.filter((id: number) => Number.isFinite(id))
					: [];
				if (!Number.isFinite(peerId)) return;
				if (peerId === readerUserId || peerUserIds.includes(peerId)) {
					invalidateActiveThread();
				}
			},
		);

		socket.on("group:message", (payload: { groupId?: number | string } & { message?: { groupId?: number } }) => {
			invalidateInbox();
			const currentThreadId = activeThreadIdRef.current;
			const rawId =
				payload?.groupId ?? payload?.message?.groupId;
			const groupId = Number(rawId ?? Number.NaN);
			if (
				currentThreadId &&
				Number.isFinite(groupId) &&
				currentThreadId === `group:${groupId}`
			) {
				invalidateActiveThread();
			}
		});

		socket.on("group:read", (payload: { groupId?: number | string }) => {
			invalidateInbox();
			const currentThreadId = activeThreadIdRef.current;
			const groupId = Number(payload?.groupId ?? Number.NaN);
			if (
				currentThreadId &&
				Number.isFinite(groupId) &&
				currentThreadId === `group:${groupId}`
			) {
				invalidateActiveThread();
			}
		});

		socket.on("message:deleted", () => {
			invalidateInbox();
			invalidateActiveThread();
		});

		socket.on("group:message:deleted", () => {
			invalidateInbox();
			invalidateActiveThread();
		});

		socket.on("message:reaction", () => {
			invalidateActiveThread();
		});

		socket.on("group:reaction", (payload: { groupId?: number | string }) => {
			const currentThreadId = activeThreadIdRef.current;
			const groupId = Number(payload?.groupId ?? Number.NaN);
			if (
				currentThreadId &&
				Number.isFinite(groupId) &&
				currentThreadId === `group:${groupId}`
			) {
				invalidateActiveThread();
			}
		});

		return () => {
			socket.disconnect();
		};
	}, [isManager, portalLoading, queryClient, token]);

	if (threadsLoading && !threads.length) {
		return (
			<div className="flex h-screen items-center justify-center pb-20">
				<div className="text-center">
					<Loader2 className="w-10 h-10 animate-spin text-primary mx-auto" />
					<p className="mt-4 text-sm text-muted-foreground font-medium">
						Connecting to secure chat...
					</p>
				</div>
			</div>
		);
	}

	return (
		<div className="container mx-auto p-4 h-[calc(100vh-140px)] flex flex-col space-y-4">
			<div className="flex items-center justify-between px-2">
				<div>
					<h1 className="text-3xl font-black italic uppercase tracking-tight">
						Your <span className="text-primary">Inbox</span>
					</h1>
					<p className="text-muted-foreground font-medium mt-1">
						Chat with your performance coaches
					</p>
				</div>
			</div>

			<div className="flex-1 bg-card border rounded-[2.5rem] shadow-sm overflow-hidden flex flex-col md:flex-row">
				{/* Sidebar */}
				<div
					className={cn(
						"w-full md:w-80 border-r flex flex-col bg-muted/5",
						activeThreadId && "hidden md:flex",
					)}
				>
					<div className="p-6 border-b">
						<div className="relative">
							<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
							<input
								placeholder="Search messages..."
								className="w-full pl-10 pr-4 py-2.5 bg-muted/20 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
							/>
						</div>
					</div>

					<div className="flex-1 overflow-y-auto p-4 space-y-2">
						{threads.map((thread) => (
							<button
								key={thread.id}
								type="button"
								onClick={() => setActiveThreadId(thread.id)}
								className={cn(
									"w-full p-4 rounded-2xl flex items-center gap-4 transition-all text-left",
									activeThreadId === thread.id
										? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
										: "hover:bg-muted/50 text-foreground",
								)}
							>
								<div className="w-12 h-12 rounded-xl bg-background/20 flex items-center justify-center shrink-0 border border-border/10 overflow-hidden">
									{thread.avatarUrl ? (
										<img
											src={thread.avatarUrl}
											alt=""
											className="w-full h-full object-cover"
										/>
									) : thread.type === "group" ? (
										<Users className="w-6 h-6" />
									) : (
										<User className="w-6 h-6" />
									)}
								</div>
								<div className="flex-1 min-w-0">
									<div className="flex justify-between items-start mb-0.5">
										<p className="font-bold text-sm truncate uppercase tracking-tight">
											{thread.name}
										</p>
										<span
											className={cn(
												"text-[10px] font-medium opacity-60",
												activeThreadId === thread.id &&
													"text-primary-foreground",
											)}
										>
											{thread.time}
										</span>
									</div>
									<p
										className={cn(
											"text-xs truncate opacity-70",
											activeThreadId === thread.id &&
												"text-primary-foreground/80",
										)}
									>
										{thread.preview}
									</p>
								</div>
								{thread.unread > 0 && activeThreadId !== thread.id && (
									<div className="w-2 h-2 bg-primary rounded-full ring-4 ring-primary/20" />
								)}
							</button>
						))}
					</div>
				</div>

				{/* Chat Window */}
				<div
					className={cn(
						"flex-1 flex flex-col bg-card",
						!activeThreadId && "hidden md:flex",
					)}
				>
					{activeThread ? (
						<>
							{/* Chat Header */}
							<div className="p-4 md:p-6 border-b flex items-center justify-between">
								<div className="flex items-center gap-4">
									<button
										type="button"
										onClick={() => setActiveThreadId(null)}
										className="md:hidden p-2 hover:bg-muted rounded-full"
									>
										<ArrowLeft className="w-5 h-5" />
									</button>
									<div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/5">
										{activeThread.type === "group" ? (
											<Users className="w-5 h-5 text-primary" />
										) : (
											<User className="w-5 h-5 text-primary" />
										)}
									</div>
									<div>
										<h2 className="font-black uppercase italic text-sm tracking-tight">
											{activeThread.name}
										</h2>
										<p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
											{activeThread.role}
										</p>
									</div>
								</div>
								<div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-green-500/10 rounded-full">
									<Shield className="w-3 h-3 text-green-500" />
									<span className="text-[9px] font-black text-green-500 uppercase">
										Secure encrypted Chat
									</span>
								</div>
							</div>

							{/* Messages */}
							<div
								ref={scrollRef}
								className="flex-1 overflow-y-auto p-6 space-y-6 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:24px_24px] dark:bg-[radial-gradient(#1f2937_1px,transparent_1px)]"
							>
								{messagesLoading ? (
									<div className="flex items-center justify-center h-full">
										<Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
									</div>
								) : (
									parsedMessages.map((entry) => {
										const msg = entry.raw;
										const isOwn = isOwnThreadMessage({
											msg,
											currentUserId: user?.id,
											currentUserKey: user?.id
												? `user:${String(user.id)}`
												: null,
											currentUserName: user?.name,
											threadId: activeThreadId,
										});
										const showGroupSender =
											activeThread?.type === "group" && !isOwn;
										return (
											<div
												key={msg.messageKey ?? String(msg.id)}
												className={cn(
													"flex w-full",
													isOwn ? "justify-end" : "justify-start",
												)}
											>
												<div
													className={cn(
														"flex flex-col w-fit max-w-[80%] md:max-w-[70%]",
														isOwn ? "items-end" : "items-start",
													)}
												>
													{/* Sender (Group) */}
													{showGroupSender && (
														<div className="flex items-center gap-2 pl-1 pb-1">
															{msg.senderProfilePicture ? (
																<img
																	src={msg.senderProfilePicture}
																	alt=""
																	className="h-6 w-6 rounded-lg object-cover border"
																/>
															) : (
																<div className="h-6 w-6 rounded-lg bg-muted flex items-center justify-center text-[10px] font-black uppercase">
																	{(
																		msg.senderName?.trim()?.[0] ?? "T"
																	).toUpperCase()}
																</div>
															)}
															<span className="text-xs font-bold opacity-70 text-muted-foreground uppercase tracking-wider">
																{msg.senderName || "Team Member"}
															</span>
														</div>
													)}
													<div
														className={cn(
															"p-4 rounded-[2rem] text-sm font-medium leading-relaxed shadow-sm",
															isOwn
																? "bg-primary text-primary-foreground rounded-tr-none"
																: "bg-muted/80 backdrop-blur-sm border rounded-tl-none",
														)}
													>
														{entry.replyToMessageId && entry.replySnippet ? (
															<div className="mb-2 rounded-lg border-l-2 border-primary/40 bg-black/5 px-2 py-1 text-xs opacity-80">
																{entry.replySnippet}
															</div>
														) : null}
														{msg.contentType === "image" && msg.mediaUrl && (
															<div className="mb-2 rounded-2xl overflow-hidden">
																<img
																	src={msg.mediaUrl}
																	alt="Message attachment"
																	className="max-w-full h-auto"
																/>
															</div>
														)}
														{msg.contentType === "video" && msg.mediaUrl && (
															<div className="mb-2 rounded-2xl overflow-hidden aspect-video bg-black">
																<video
																	src={msg.mediaUrl}
																	controls
																	className="w-full h-full"
																>
																	<track kind="captions" />
																</video>
															</div>
														)}
														{entry.displayText}
													</div>
													<div className="mt-1 flex items-center gap-1 px-1">
														{(msg.reactions ?? []).map((reaction) => (
															<button
																key={`${msg.id}:${reaction.emoji}`}
																type="button"
																onClick={() =>
																	reactionMutation.mutate({
																		messageId: Number(msg.id),
																		emoji: reaction.emoji,
																	})
																}
																className="rounded-full border border-border/50 bg-background/80 px-2 py-0.5 text-[11px] font-semibold"
															>
																{reaction.emoji} {reaction.count}
															</button>
														))}
														<div className="flex items-center gap-1">
															{reactionOptions.map((emoji) => (
																<button
																	key={`${msg.id}:quick:${emoji}`}
																	type="button"
																	onClick={() =>
																		reactionMutation.mutate({
																			messageId: Number(msg.id),
																			emoji,
																		})
																	}
																	className="h-6 w-6 rounded-full text-xs opacity-70 hover:opacity-100"
																>
																	{emoji}
																</button>
															))}
															<span className="opacity-40">
																<Plus className="h-3 w-3" />
															</span>
														</div>
													</div>
													<span className="text-[10px] mt-1.5 px-2 font-bold text-muted-foreground uppercase tracking-widest">
														{new Date(msg.createdAt).toLocaleTimeString([], {
															hour: "2-digit",
															minute: "2-digit",
														})}
													</span>
												</div>
											</div>
										);
									})
								)}
							</div>

							{/* Composer */}
							<form
								onSubmit={handleSendMessage}
								className="p-4 md:p-6 bg-muted/5 border-t"
							>
								{attachedFile ? (
									<div className="mb-3 flex items-center justify-between rounded-xl bg-background px-3 py-2 text-xs">
										<span className="truncate font-medium">
											{attachedFile.name}
										</span>
										<button
											type="button"
											className="ml-3 rounded p-1 hover:bg-muted"
											onClick={() => setAttachedFile(null)}
											aria-label="Remove attachment"
										>
											<X className="h-4 w-4" />
										</button>
									</div>
								) : null}
								<input
									ref={fileInputRef}
									type="file"
									className="hidden"
									onChange={(e) => {
										const file = e.currentTarget.files?.[0] ?? null;
										setAttachedFile(file);
										e.currentTarget.value = "";
									}}
								/>
								<div className="relative flex items-center gap-3">
									<button
										type="button"
										className="h-10 w-10 shrink-0 rounded-xl border border-border bg-background/90 flex items-center justify-center hover:bg-muted"
										onClick={() => fileInputRef.current?.click()}
										aria-label="Attach file"
									>
										<Paperclip className="h-4 w-4" />
									</button>
									<input
										value={newMessage}
										onChange={(e) => setNewMessage(e.target.value)}
										placeholder="Type your message..."
										className="flex-1 h-14 pl-6 pr-16 bg-background border rounded-[1.25rem] text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-inner"
									/>
									<button
										type="submit"
										disabled={
											(!newMessage.trim() && !attachedFile) ||
											sendMutation.isPending ||
											isUploadingAttachment
										}
										className="absolute right-2 w-10 h-10 bg-primary text-primary-foreground rounded-xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all disabled:opacity-50 shadow-lg shadow-primary/20"
									>
										{sendMutation.isPending || isUploadingAttachment ? (
											<Loader2 className="w-5 h-5 animate-spin" />
										) : (
											<Send className="w-5 h-5" />
										)}
									</button>
								</div>
							</form>
						</>
					) : (
						<div className="flex-1 flex flex-col items-center justify-center text-center p-12 space-y-6">
							<div className="w-24 h-24 bg-muted/20 rounded-[2rem] flex items-center justify-center border-2 border-dashed border-border">
								<MessageSquare className="w-10 h-10 text-muted-foreground opacity-20" />
							</div>
							<div>
								<h3 className="text-xl font-bold uppercase italic tracking-tight">
									Select a conversation
								</h3>
								<p className="text-sm text-muted-foreground max-w-xs mx-auto mt-2 leading-relaxed">
									Choose a performance coach or team group from the left to
									start collaborating on your training.
								</p>
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
