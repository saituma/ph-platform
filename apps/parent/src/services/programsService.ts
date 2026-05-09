import { api } from "#/lib/api-client";

export type Program = {
	id: string;
	name: string;
	description?: string | null;
	totalSessions: number;
	completedSessions: number;
	tier?: string | null;
	startDate?: string | null;
	endDate?: string | null;
};

export const programsService = {
	getChildPrograms: (athleteId: string) =>
		api.get<{ programs: Program[] }>(`/api/portal/guardian/children/${athleteId}/programs`),
};
