import { api } from "#/lib/api-client";

export type Child = {
	id: string;
	name: string;
	age: number | null;
	athleteType: "youth" | "adult";
	team?: { id: string; name: string } | null;
	currentProgramTier?: string | null;
	currentPlanId?: string | null;
	performanceGoals?: string | null;
	injuries?: string | null;
};

export type GuardianChildren = { children: Child[] };

export const athleteService = {
	getChildren: () => api.get<GuardianChildren>("/api/portal/guardian/children"),

	getChild: (athleteId: string) =>
		api.get<Child & { programs: unknown[]; recentSessions: unknown[] }>(
			`/api/portal/guardian/children/${athleteId}`,
		),

	addChild: (data: {
		name: string;
		age?: number;
		athleteType: "youth" | "adult";
		injuries?: string;
		performanceGoals?: string;
	}) => api.post("/api/portal/guardian/children", data),

	updateChild: (athleteId: string, data: Partial<Child>) =>
		api.patch(`/api/portal/guardian/children/${athleteId}`, data),
};
