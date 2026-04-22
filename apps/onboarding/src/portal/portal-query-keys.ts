export const portalKeys = {
	all: ["portal"] as const,
	user: (token: string | null) => [...portalKeys.all, "user", token] as const,
};
