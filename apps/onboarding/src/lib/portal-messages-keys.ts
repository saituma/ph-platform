/** React Query keys for /portal/messages (lives under `lib/`, not `routes/`, so it is not a TanStack route file). */
export const messageKeys = {
	all: ["messages"] as const,
	inbox: (token: string | null, isManager: boolean = false) =>
		[...messageKeys.all, "inbox", token, isManager] as const,
	thread: (token: string | null, threadId: string | null) =>
		[...messageKeys.all, "thread", token, threadId] as const,
};
