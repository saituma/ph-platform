import { api } from "#/lib/api-client";

export const messagesService = {
	getInbox: () => api.get<{ conversations: unknown[] }>("/api/messages/inbox"),

	getMessages: (conversationId: string) =>
		api.get<{ messages: unknown[] }>(`/api/messages?conversationId=${conversationId}`),

	sendMessage: (content: string, opts: { conversationId?: string; groupId?: string }) =>
		api.post("/api/messages", { content, ...opts }),

	searchMessages: (query: string) =>
		api.get<{ results: unknown[] }>(`/api/messages/search?q=${encodeURIComponent(query)}`),
};
