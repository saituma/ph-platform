import { publicApiUrl } from "@/lib/public-api";

export type ApiChatMessage = {
	id: number;
	messageKey?: string;
	senderId: number;
	senderUserKey?: string;
	receiverId?: number;
	content: string;
	contentType?: "text" | "image" | "video";
	mediaUrl?: string;
	read: boolean;
	createdAt: string;
	deliveredCount?: number;
	readCount?: number;
	myReadAt?: string | null;
	// Present for group chat endpoints (`/chat/groups/:id/messages`).
	senderName?: string | null;
	senderProfilePicture?: string | null;
	reactions?: { emoji: string; count: number; userIds: number[] }[];
};

export type SendMessagePayload = {
	content: string;
	contentType?: "text" | "image" | "video";
	mediaUrl?: string;
};

export type ApiCoach = {
	id: number;
	name: string;
	role?: string;
	profilePicture?: string | null;
	isAi?: boolean;
};

export type ApiChatGroup = {
	id: number;
	name: string;
	category?: string;
	createdAt: string;
	unreadCount?: number;
	lastMessage?: {
		content: string;
		contentType?: string;
		createdAt: string;
		messageKey?: string;
		senderUserKey?: string;
		senderName?: string | null;
		senderProfilePicture?: string | null;
	} | null;
};

export type MessageThread = {
	id: string;
	name: string;
	role: string;
	preview: string;
	time: string;
	unread: number;
	avatarUrl?: string | null;
	type: "direct" | "group";
};

type UnifiedInboxThread = {
	id: string;
	type: "direct" | "group";
	peerUserId?: number;
	groupId?: number;
	groupCategory?: string;
	name: string;
	role: string;
	avatarUrl?: string | null;
	preview: string;
	unread: number;
	updatedAt: string;
};

export type ParsedReplyPrefix = {
	replyToMessageId: number | null;
	replyPreview: string;
	text: string;
};

const REPLY_PREFIX_RE = /^\[reply:(\d+):([^\]]*)\]\s*/;

export function parseReplyPrefix(raw: string): ParsedReplyPrefix {
	const input = String(raw ?? "");
	const match = input.match(REPLY_PREFIX_RE);
	if (!match) return { replyToMessageId: null, replyPreview: "", text: input };
	const replyToMessageId = Number(match[1]);
	const encodedPreview = match[2] ?? "";
	let replyPreview = "";
	try {
		replyPreview = decodeURIComponent(encodedPreview);
	} catch {
		replyPreview = encodedPreview;
	}
	return {
		replyToMessageId: Number.isFinite(replyToMessageId) ? replyToMessageId : null,
		replyPreview,
		text: input.slice(match[0].length),
	};
}

export async function fetchInbox(
	_token?: string,
	isManager: boolean = false,
): Promise<{ threads: MessageThread[] }> {
	try {
		const inboxRes = await fetch(
			publicApiUrl(
				`/api/messages/inbox?includeAdminThreads=${isManager ? "1" : "0"}`,
			),
			{
				credentials: "include",
			},
		);
		const inboxData = inboxRes.ok
			? await inboxRes.json()
			: ({ threads: [] } as { threads: UnifiedInboxThread[] });

		const threads: MessageThread[] = (inboxData.threads ?? []).map(
			(thread: UnifiedInboxThread) => ({
				id: thread.id,
				name: thread.name,
				role: thread.role || "Message",
				avatarUrl: thread.avatarUrl ?? null,
				preview: thread.preview || "No messages yet",
				time: thread.updatedAt
					? new Date(thread.updatedAt).toLocaleTimeString([], {
							hour: "2-digit",
							minute: "2-digit",
						})
					: "",
				unread: Number(thread.unread ?? 0) || 0,
				type: thread.type === "group" ? "group" : "direct",
			}),
		);

		return {
			threads: threads.sort(
				(a, b) =>
					new Date(b.time || 0).getTime() - new Date(a.time || 0).getTime(),
			),
		};
	} catch (err) {
		console.error("Fetch inbox error:", err);
		return { threads: [] };
	}
}

export async function fetchThreadMessages(
	_token: string,
	threadId: string,
): Promise<ApiChatMessage[]> {
	const [type, id] = threadId.split(":");

	let endpoint = publicApiUrl("/api/messages");
	if (type === "group")
		endpoint = publicApiUrl(`/api/chat/groups/${id}/messages`);
	if (type === "admin") endpoint = publicApiUrl(`/api/admin/messages/${id}`);
	if (type === "coach")
		endpoint = publicApiUrl(`/api/messages?peerUserId=${id}`);

	const response = await fetch(endpoint, {
		credentials: "include",
	});

	if (!response.ok) throw new Error("Failed to fetch messages");
	const data = await response.json();
	return data.messages || [];
}

export async function uploadMessageAttachment(
	_token: string,
	file: File,
): Promise<{ mediaUrl: string; contentType: "text" | "image" | "video" }> {
	const mimeType = String(file.type || "application/octet-stream").toLowerCase();
	const isImage = mimeType.startsWith("image/");
	const isVideo = mimeType.startsWith("video/");
	const contentType: "text" | "image" | "video" = isImage
		? "image"
		: isVideo
			? "video"
			: "text";
	const folder = isImage
		? "messages/images"
		: isVideo
			? "messages/videos"
			: "messages/files";
	const presignRes = await fetch(publicApiUrl("/api/media/presign"), {
		method: "POST",
		credentials: "include",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			folder,
			fileName: file.name || `upload-${Date.now()}`,
			contentType: file.type || "application/octet-stream",
			sizeBytes: file.size || 0,
			client: "web",
		}),
	});
	if (!presignRes.ok) throw new Error("Could not start upload");
	const presignData = (await presignRes.json()) as {
		uploadUrl: string;
		publicUrl: string;
	};
	const putRes = await fetch(presignData.uploadUrl, {
		method: "PUT",
		headers: { "Content-Type": file.type || "application/octet-stream" },
		body: file,
	});
	if (!putRes.ok) throw new Error("Could not upload attachment");
	return { mediaUrl: presignData.publicUrl, contentType };
}

export async function sendMessage(
	_token: string,
	threadId: string,
	input: SendMessagePayload,
): Promise<any> {
	const [type, id] = threadId.split(":");

	let endpoint = publicApiUrl("/api/messages");
	if (type === "group")
		endpoint = publicApiUrl(`/api/chat/groups/${id}/messages`);
	if (type === "admin") endpoint = publicApiUrl(`/api/admin/messages/${id}`);

	const body: any = {
		content: input.content,
		contentType: input.contentType ?? "text",
		mediaUrl: input.mediaUrl,
	};
	if (type === "coach") body.receiverId = Number(id);

	const response = await fetch(endpoint, {
		method: "POST",
		credentials: "include",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify(body),
	});

	if (!response.ok) throw new Error("Failed to send message");
	return response.json();
}

export async function toggleMessageReaction(
	_token: string,
	threadId: string,
	messageId: number,
	emoji: string,
): Promise<{ reactions: { emoji: string; count: number; userIds: number[] }[] }> {
	const [type, id] = threadId.split(":");
	let endpoint = publicApiUrl(`/api/messages/${messageId}/reactions`);
	if (type === "group") {
		endpoint = publicApiUrl(
			`/api/chat/groups/${id}/messages/${messageId}/reactions`,
		);
	}
	const response = await fetch(endpoint, {
		method: "PUT",
		credentials: "include",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({ emoji }),
	});
	if (!response.ok) throw new Error("Failed to react to message");
	return response.json();
}
