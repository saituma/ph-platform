import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useRef, useEffect } from "react";
import { Send, MessageSquare } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { api } from "#/lib/api-client";
import { queryKeys } from "#/lib/query-keys";
import { cn } from "#/lib/utils";

export const Route = createFileRoute("/_app/messages")({
	component: MessagesPage,
});

type Message = {
	id: string;
	content: string;
	senderId: string;
	senderName: string;
	createdAt: string;
	isOwn: boolean;
};

type Conversation = {
	id: string;
	name: string;
	lastMessage?: string | null;
	lastMessageAt?: string | null;
	unreadCount: number;
	type: "direct" | "group";
};

function MessagesPage() {
	const queryClient = useQueryClient();
	const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
	const [inputValue, setInputValue] = useState("");
	const messagesEndRef = useRef<HTMLDivElement>(null);

	const { data: inboxData, isLoading: inboxLoading } = useQuery<{ conversations: Conversation[] }>({
		queryKey: queryKeys.messagesInbox,
		queryFn: () => api.get<{ conversations: Conversation[] }>("/api/messages/inbox"),
	});

	const { data: messagesData } = useQuery<{ messages: Message[] }>({
		queryKey: [...queryKeys.messages, activeConversation?.id],
		queryFn: () => api.get<{ messages: Message[] }>(`/api/messages?conversationId=${activeConversation!.id}`),
		enabled: !!activeConversation,
	});

	const sendMutation = useMutation({
		mutationFn: (content: string) =>
			api.post("/api/messages", {
				content,
				...(activeConversation?.type === "group"
					? { groupId: activeConversation.id }
					: { conversationId: activeConversation?.id }),
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: [...queryKeys.messages, activeConversation?.id] });
			queryClient.invalidateQueries({ queryKey: queryKeys.messagesInbox });
			setInputValue("");
		},
		onError: () => toast.error("Failed to send message"),
	});

	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [messagesData?.messages]);

	const handleSend = (e: React.FormEvent) => {
		e.preventDefault();
		const text = inputValue.trim();
		if (!text || !activeConversation) return;
		sendMutation.mutate(text);
	};

	const conversations = inboxData?.conversations ?? [];
	const messages = messagesData?.messages ?? [];

	return (
		<div className="flex h-full overflow-hidden">
			{/* Conversation list */}
			<div className={cn(
				"w-full sm:w-72 lg:w-80 flex-shrink-0 border-r border-border flex flex-col",
				activeConversation ? "hidden sm:flex" : "flex",
			)}>
				<div className="px-4 py-3.5 border-b border-border">
					<p className="label-mono">Inbox</p>
				</div>

				<div className="flex-1 overflow-y-auto">
					{inboxLoading ? (
						<div className="p-4 space-y-3">
							{[1, 2, 3].map((i) => (
								<div key={i} className="animate-pulse flex items-center gap-3">
									<div className="w-9 h-9 bg-muted" />
									<div className="flex-1 space-y-1.5">
										<div className="h-3.5 bg-muted w-2/3" />
										<div className="h-3 bg-muted w-1/2" />
									</div>
								</div>
							))}
						</div>
					) : conversations.length === 0 ? (
						<div className="p-8 text-center">
							<MessageSquare size={28} className="mx-auto text-muted-foreground/20 mb-3" />
							<p className="text-sm text-muted-foreground font-mono">No messages yet</p>
						</div>
					) : (
						conversations.map((conv) => (
							<button
								key={conv.id}
								type="button"
								onClick={() => setActiveConversation(conv)}
								className={cn(
									"w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/30 transition-colors border-b border-border/50",
									activeConversation?.id === conv.id && "bg-primary/5 border-l-2 border-l-primary",
								)}
							>
								<div className="w-9 h-9 bg-primary/10 flex items-center justify-center flex-shrink-0">
									<span className="text-primary text-sm font-black">{conv.name.charAt(0)}</span>
								</div>
								<div className="flex-1 min-w-0">
									<div className="flex items-center justify-between gap-1">
										<span className="text-sm font-bold text-foreground truncate">{conv.name}</span>
										{conv.lastMessageAt && (
											<span className="text-xs text-muted-foreground font-mono flex-shrink-0">
												{format(new Date(conv.lastMessageAt), "HH:mm")}
											</span>
										)}
									</div>
									{conv.lastMessage && (
										<p className="text-xs text-muted-foreground font-mono truncate">{conv.lastMessage}</p>
									)}
								</div>
								{conv.unreadCount > 0 && (
									<div className="w-5 h-5 bg-primary flex items-center justify-center flex-shrink-0">
										<span className="text-primary-foreground text-xs font-black">{conv.unreadCount}</span>
									</div>
								)}
							</button>
						))
					)}
				</div>
			</div>

			{/* Message thread */}
			<div className={cn(
				"flex-1 flex flex-col min-w-0",
				!activeConversation ? "hidden sm:flex" : "flex",
			)}>
				{activeConversation ? (
					<>
						<div className="flex items-center gap-3 px-4 py-3.5 border-b border-border flex-shrink-0">
							<button
								type="button"
								onClick={() => setActiveConversation(null)}
								className="sm:hidden text-muted-foreground hover:text-foreground text-sm font-mono"
							>
								←
							</button>
							<div className="w-8 h-8 bg-primary/10 flex items-center justify-center">
								<span className="text-primary text-xs font-black">{activeConversation.name.charAt(0)}</span>
							</div>
							<span className="font-bold text-sm text-foreground uppercase tracking-wide">{activeConversation.name}</span>
						</div>

						<div className="flex-1 overflow-y-auto p-4 space-y-3">
							{messages.map((msg) => (
								<div key={msg.id} className={cn("flex", msg.isOwn ? "justify-end" : "justify-start")}>
									<div className={cn(
										"max-w-[75%] px-4 py-2.5",
										msg.isOwn
											? "bg-primary text-primary-foreground"
											: "bg-muted text-foreground border border-border",
									)}>
										{!msg.isOwn && (
											<div className="text-xs font-bold mb-1 opacity-70 font-mono uppercase tracking-wide">
												{msg.senderName}
											</div>
										)}
										<p className="text-sm">{msg.content}</p>
										<div className={cn(
											"text-xs mt-1 opacity-60 font-mono",
											msg.isOwn ? "text-right" : "text-left",
										)}>
											{format(new Date(msg.createdAt), "HH:mm")}
										</div>
									</div>
								</div>
							))}
							<div ref={messagesEndRef} />
						</div>

						<form onSubmit={handleSend} className="flex items-center gap-2 px-4 py-3 border-t border-border flex-shrink-0">
							<input
								value={inputValue}
								onChange={(e) => setInputValue(e.target.value)}
								placeholder="Type a message…"
								className="flex-1 px-3.5 py-2.5 border border-input bg-background text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring text-sm transition-all"
							/>
							<button
								type="submit"
								disabled={!inputValue.trim() || sendMutation.isPending}
								className="w-9 h-9 bg-primary text-primary-foreground flex items-center justify-center hover:opacity-90 disabled:opacity-50 transition-opacity flex-shrink-0"
							>
								<Send size={14} />
							</button>
						</form>
					</>
				) : (
					<div className="flex-1 flex items-center justify-center">
						<div className="text-center">
							<MessageSquare size={40} className="mx-auto text-muted-foreground/15 mb-3" />
							<p className="text-sm text-muted-foreground font-mono">Select a conversation</p>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
