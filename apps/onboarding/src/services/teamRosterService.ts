import { env } from "@/env";

const baseUrl = () => env.VITE_PUBLIC_API_URL || "http://localhost:3000";

export const rosterQueryKeys = {
	all: ["teamRoster"] as const,
	list: (token: string | null) => [...rosterQueryKeys.all, token] as const,
	athlete: (token: string | null, athleteId: number) =>
		[...rosterQueryKeys.all, "athlete", token, athleteId] as const,
	nutrition: (token: string | null, userId: number) =>
		[...rosterQueryKeys.all, "nutrition", token, userId] as const,
};

export type NutritionLogSummary = {
	id: number;
	dateKey: string;
	breakfast?: string | null;
	lunch?: string | null;
	dinner?: string | null;
	snacksMorning?: string | null;
	snacksAfternoon?: string | null;
	snacksEvening?: string | null;
	waterIntake?: number | null;
	steps?: number | null;
	sleepHours?: number | null;
	mood?: number | null;
	energy?: number | null;
	pain?: number | null;
	foodDiary?: string | null;
	updatedAt?: string | null;
	coachFeedback?: string | null;
};

/** Coach/admin: load an athlete’s nutrition rows (same auth as `/api/nutrition/logs`). */
export async function fetchAthleteNutritionLogs(
	token: string,
	athleteUserId: number,
	lastNDays: number,
): Promise<{ logs: NutritionLogSummary[] }> {
	const end = new Date();
	const start = new Date(end);
	start.setUTCDate(start.getUTCDate() - (lastNDays - 1));
	const to = end.toISOString().slice(0, 10);
	const from = start.toISOString().slice(0, 10);
	const qs = new URLSearchParams({
		userId: String(athleteUserId),
		from,
		to,
		limit: String(Math.max(lastNDays + 10, 40)),
	});
	const res = await fetch(`${baseUrl()}/api/nutrition/logs?${qs}`, {
		headers: { Authorization: `Bearer ${token}` },
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok) {
		throw new Error(
			(data as { error?: string }).error || "Failed to load nutrition logs",
		);
	}
	return { logs: (data as { logs?: NutritionLogSummary[] }).logs ?? [] };
}

export type TeamRosterResponse = {
	team: {
		id: number;
		name: string;
		maxAthletes: number;
		emailSlug: string;
		memberCount: number;
		slotsRemaining: number;
	};
	members: Array<{
		athleteId: number;
		name: string;
		age: number;
		birthDate: string | null;
		profilePicture: string | null;
		athleteType: string;
		email: string;
		userId: number;
	}>;
};

export async function fetchTeamRoster(
	token: string,
): Promise<TeamRosterResponse> {
	const res = await fetch(`${baseUrl()}/api/team/roster`, {
		headers: { Authorization: `Bearer ${token}` },
	});
	if (!res.ok) {
		const err = await res.json().catch(() => ({}));
		throw new Error(
			(err as { error?: string }).error || "Failed to load team roster",
		);
	}
	return res.json() as Promise<TeamRosterResponse>;
}

export async function createTeamAthlete(
	token: string,
	body: {
		username: string;
		name: string;
		age: number;
		birthDate?: string | null;
		profilePicture?: string | null;
		/** If omitted, server generates a random temporary password. */
		customPassword?: string;
	},
): Promise<{
	athleteId: number;
	userId: number;
	email: string;
	temporaryPassword: string;
	teamSlug: string;
}> {
	const res = await fetch(`${baseUrl()}/api/team/roster/athletes`, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${token}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify(body),
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok) {
		throw new Error(
			(data as { error?: string }).error || "Failed to create athlete",
		);
	}
	return data as {
		athleteId: number;
		userId: number;
		email: string;
		temporaryPassword: string;
		teamSlug: string;
	};
}

export type TeamAthleteDetail = {
	athleteId: number;
	userId: number;
	name: string;
	age: number;
	birthDate: string | null;
	athleteType: string;
	teamId: number | null;
	teamName: string;
	trainingPerWeek: number;
	injuries: unknown;
	growthNotes: string | null;
	performanceGoals: string | null;
	equipmentAccess: string | null;
	profilePicture: string | null;
	onboardingCompleted: boolean;
	email: string;
	accountName: string;
	emailVerified: boolean;
	userCreatedAt: string;
	userUpdatedAt: string;
	canResetPassword: true;
};

export async function fetchTeamAthleteDetail(
	token: string,
	athleteId: number,
): Promise<TeamAthleteDetail> {
	const res = await fetch(
		`${baseUrl()}/api/team/roster/athletes/${athleteId}`,
		{
			headers: { Authorization: `Bearer ${token}` },
		},
	);
	const data = await res.json().catch(() => ({}));
	if (!res.ok) {
		throw new Error(
			(data as { error?: string }).error || "Failed to load athlete",
		);
	}
	return data as TeamAthleteDetail;
}

export async function resetTeamAthletePassword(
	token: string,
	athleteId: number,
	customPassword?: string,
): Promise<{ email: string; temporaryPassword: string }> {
	const body =
		customPassword !== undefined && customPassword.trim().length > 0
			? JSON.stringify({ customPassword: customPassword.trim() })
			: "{}";
	const res = await fetch(
		`${baseUrl()}/api/team/roster/athletes/${athleteId}/reset-password`,
		{
			method: "POST",
			headers: {
				Authorization: `Bearer ${token}`,
				"Content-Type": "application/json",
			},
			body,
		},
	);
	const data = await res.json().catch(() => ({}));
	if (!res.ok) {
		throw new Error(
			(data as { error?: string }).error || "Failed to reset password",
		);
	}
	return data as { email: string; temporaryPassword: string };
}

export type UpdateTeamAthleteBody = {
	name?: string;
	age?: number;
	birthDate?: string | null;
	athleteType?: "youth" | "adult";
	trainingPerWeek?: number;
	performanceGoals?: string | null;
	equipmentAccess?: string | null;
	growthNotes?: string | null;
	profilePicture?: string | null;
};

export async function updateTeamAthlete(
	token: string,
	athleteId: number,
	body: UpdateTeamAthleteBody,
): Promise<{ ok: true }> {
	const res = await fetch(
		`${baseUrl()}/api/team/roster/athletes/${athleteId}`,
		{
			method: "PATCH",
			headers: {
				Authorization: `Bearer ${token}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify(body),
		},
	);
	const data = await res.json().catch(() => ({}));
	if (!res.ok) {
		throw new Error(
			(data as { error?: string }).error || "Failed to update athlete",
		);
	}
	return data as { ok: true };
}

/** Upload a local image via presigned URL; returns public URL for profilePicture. */
export async function uploadTeamAthletePhoto(
	token: string,
	file: File,
): Promise<string> {
	const presign = await fetch(`${baseUrl()}/api/media/presign`, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${token}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			folder: "profiles/team-athletes",
			fileName: file.name || "photo.jpg",
			contentType: file.type || "image/jpeg",
			sizeBytes: file.size,
			client: "web",
		}),
	});
	const data = await presign.json().catch(() => ({}));
	if (!presign.ok) {
		throw new Error(
			(data as { error?: string }).error || "Could not start upload",
		);
	}
	const { uploadUrl, publicUrl } = data as {
		uploadUrl: string;
		publicUrl: string;
	};
	const put = await fetch(uploadUrl, {
		method: "PUT",
		headers: {
			"Content-Type": file.type || "application/octet-stream",
		},
		body: file,
	});
	if (!put.ok) {
		throw new Error("Upload failed — try a smaller image.");
	}
	return publicUrl;
}

export async function updateTeamEmailSlug(
	token: string,
	emailSlug: string,
): Promise<void> {
	const res = await fetch(`${baseUrl()}/api/team/roster/email-slug`, {
		method: "PATCH",
		headers: {
			Authorization: `Bearer ${token}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({ emailSlug }),
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok) {
		throw new Error(
			(data as { error?: string }).error ||
				"Failed to update team email segment",
		);
	}
}
