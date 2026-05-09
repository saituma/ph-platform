import { api } from "#/lib/api-client";

export const billingService = {
	getStatus: () => api.get<{ plan: unknown; status: string | null; currentPeriodEnd: string | null }>("/api/billing/status"),

	getPlans: () => api.get<{ plans: unknown[] }>("/api/billing/plans"),

	getInvoices: () => api.get<{ invoices: unknown[] }>("/api/billing/invoices"),

	createCheckout: (planId: string) => api.post<{ url: string }>("/api/billing/checkout", { planId }),
};
