import { getAuthHeaders } from "@/lib/client-storage";

export const teamManagersQueryKeys = {
	all: ["teamManagers"] as const,
	list: (token: string | null) =>
		[...teamManagersQueryKeys.all, token] as const,
};

export type TeamManagerSummary = {
	userId: number;
	name: string | null;
	email: string;
	role: string | null;
	createdAt: string | null;
};

export type TeamManagersResponse = {
	primary: TeamManagerSummary | null;
	coManagers: TeamManagerSummary[];
	teamId: number;
	isPrimary: boolean;
};

export async function fetchTeamManagers(): Promise<TeamManagersResponse> {
	const res = await fetch(`/api/team/managers`, {
		credentials: "include",
		headers: getAuthHeaders(),
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok) {
		throw new Error(
			(data as { error?: string }).error || "Failed to load team managers",
		);
	}
	return data as TeamManagersResponse;
}

export async function inviteCoManager(body: {
	email: string;
	name?: string;
}): Promise<{
	userId: number;
	email: string;
	created: boolean;
	temporaryPassword: string | null;
}> {
	const res = await fetch(`/api/team/managers`, {
		method: "POST",
		credentials: "include",
		headers: { "Content-Type": "application/json", ...getAuthHeaders() },
		body: JSON.stringify(body),
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok) {
		throw new Error(
			(data as { error?: string }).error || "Failed to add co-manager",
		);
	}
	return data as {
		userId: number;
		email: string;
		created: boolean;
		temporaryPassword: string | null;
	};
}

export async function removeCoManager(
	userId: number,
): Promise<{ removed: boolean }> {
	const res = await fetch(`/api/team/managers/${userId}`, {
		method: "DELETE",
		credentials: "include",
		// API guards mutating requests with a Content-Type: application/json check (415 otherwise).
		headers: { "Content-Type": "application/json", ...getAuthHeaders() },
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok) {
		throw new Error(
			(data as { error?: string }).error || "Failed to remove co-manager",
		);
	}
	return data as { removed: boolean };
}
