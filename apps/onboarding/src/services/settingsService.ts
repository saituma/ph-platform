import { config } from "@/lib/config";
import { getClientAuthToken } from "@/lib/client-storage";

const API_BASE_URL = config.api.baseUrl.replace(/\/+$/, "");

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

export type BillingCycle = "monthly" | "six_months" | "yearly";

export type BillingPlan = {
	id: number;
	name: string;
	tier: string;
	displayPrice?: string | null;
	billingInterval?: string | null;
	isActive?: boolean | null;
	billingQuote?: {
		amount?: string | null;
		currency?: string | null;
		billingCycle?: BillingCycle;
		mode?: "subscription" | "payment";
	} | null;
	pricing?: {
		monthly?: { discounted?: string | null } | null;
		badge?: string | null;
	} | null;
};

export type BillingStatus = {
	athlete: any | null;
	currentProgramTier: string | null;
	latestRequest: any | null;
	messagingAccessTiers: string[];
};

export const settingsService = {
	// Account
	updateProfile: (data: { name?: string; profilePicture?: string }) =>
		apiRequest("/auth/me", { method: "PATCH", body: data }),

	changePassword: (data: { oldPassword: string; newPassword: string }) =>
		apiRequest<{ ok: boolean }>("/auth/change-password", {
			method: "POST",
			body: data,
		}),

	deleteAccount: (password: string) =>
		apiRequest("/auth/delete-account", {
			method: "POST",
			body: { password },
		}),

	// Billing
	getBillingStatus: () => apiRequest<BillingStatus>("/billing/status"),

	getBillingPlans: (billingCycle: BillingCycle) =>
		apiRequest<{ plans: BillingPlan[] }>(
			`/billing/plans?${new URLSearchParams({ billingCycle }).toString()}`,
		),

	createCheckout: (data: { planId: number; billingCycle: BillingCycle }) =>
		apiRequest<{ checkoutUrl: string; sessionId: string }>("/billing/checkout", {
			method: "POST",
			body: data,
		}),

	createTeamCheckout: (data: {
		teamId: number;
		planId: number;
		billingCycle: BillingCycle;
	}) =>
		apiRequest<{ checkoutUrl: string; sessionId: string }>(
			"/billing/team/checkout",
			{
				method: "POST",
				body: data,
			},
		),

	downgradePlan: (tier: string) =>
		apiRequest<{ currentProgramTier: string }>("/billing/downgrade", {
			method: "POST",
			body: { tier },
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

	// Activity feed
	getActivityFeed: (params?: { limit?: number; offset?: number }) => {
		const qs = new URLSearchParams({
			limit: String(params?.limit ?? 20),
			offset: String(params?.offset ?? 0),
		});
		return apiRequest<{ items: any[]; total: number }>(`/activity/feed?${qs.toString()}`);
	},

	// Billing invoices
	getInvoices: () =>
		apiRequest<{
			invoices: Array<{
				id: number;
				receiptPublicId: string;
				status: string;
				paymentStatus: string | null;
				billingCycle: string | null;
				amount: string | null;
				date: string;
				plan: string;
			}>;
		}>("/billing/invoices"),

	// Notifications
	getNotifications: () =>
		apiRequest<{
			items: Array<{
				id: number;
				type: string | null;
				content: string | null;
				read: boolean;
				link: string | null;
				createdAt: string;
			}>;
		}>("/notifications"),

	markNotificationRead: (notificationId: number) =>
		apiRequest("/notifications/read", { method: "POST", body: { notificationId } }),

	// Referral
	getMyReferralCode: () => apiRequest<{ code: string }>("/referral/my-code"),

	getMyReferrals: () =>
		apiRequest<{
			code: string | null;
			total: number;
			referrals: Array<{ id: number; claimedAt: string; displayName: string }>;
		}>("/referral/my-referrals"),

	// Physio referral (assigned by coach/admin)
	getMyPhysioReferral: () =>
		apiRequest<{ item: any }>("/physio-referral"),

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
