import { env } from "@/env";
import { getClientAuthToken } from "@/lib/client-storage";

const API_BASE_URL = (env.VITE_PUBLIC_API_URL ?? "http://localhost:3000").replace(/\/+$/, "");

async function apiRequest<T>(
	endpoint: string,
	options: {
		method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
		body?: any;
		headers?: Record<string, string>;
	} = {},
): Promise<T> {
	const token = getClientAuthToken();
	const { method = "GET", body, headers = {} } = options;

	const path = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
	const url = `${API_BASE_URL}/api${path}`;

	const res = await fetch(url, {
		method,
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${token}`,
			...headers,
		},
		body: body ? JSON.stringify(body) : undefined,
	});

	if (!res.ok) {
		const errorData = await res.json().catch(() => ({}));
		throw new Error(errorData.message || `API error: ${res.status}`);
	}

	return res.json();
}

export const settingsService = {
	// Account
	updateProfile: (data: { name?: string; profilePicture?: string }) =>
		apiRequest("/auth/me", { method: "PATCH", body: data }),

	deleteAccount: (password: string) =>
		apiRequest("/auth/delete-account", {
			method: "POST",
			body: { password },
		}),

	// Nutrition
	getNutritionLogs: (params: { userId: string | number; from: string; to: string; limit?: number }) => {
		const qs = new URLSearchParams({
			userId: String(params.userId),
			from: params.from,
			to: params.to,
			limit: String(params.limit || 5),
		});
		return apiRequest<{ logs: any[] }>(`/nutrition/logs?${qs.toString()}`);
	},

	saveNutritionLog: (data: any) =>
		apiRequest("/nutrition/logs", { method: "POST", body: data }),

	getNutritionTargets: (userId: string | number) =>
		apiRequest<{ targets: any }>(`/nutrition/targets/${userId}`),

	getNutritionReminderSettings: () =>
		apiRequest<{ settings: any }>("/nutrition/reminder-settings"),

	updateNutritionReminderSettings: (data: any) =>
		apiRequest("/nutrition/reminder-settings", { method: "PUT", body: data }),

	// Announcements
	getAnnouncements: (actingUserId?: string | number) => {
		const headers = actingUserId ? { "X-Acting-User-Id": String(actingUserId) } : undefined;
		return apiRequest<{ items: any[] }>("/content/announcements", { headers });
	},

	// Support
	submitFeedback: (data: { category: string; message: string }) =>
		apiRequest("/support/app-feedback", { method: "POST", body: data }),

	submitTestimonial: (data: { quote: string; rating: number; photoUrl?: string }) =>
		apiRequest("/content/testimonials/submit", { method: "POST", body: data }),

	// Media
	presignUpload: (data: { folder: string; fileName: string; contentType: string; sizeBytes: number }) =>
		apiRequest<{ uploadUrl: string; publicUrl: string }>("/media/presign", {
			method: "POST",
			body: data,
		}),
};
