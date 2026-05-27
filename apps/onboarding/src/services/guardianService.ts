async function apiRequest<T>(
	endpoint: string,
	options: {
		method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
		body?: any;
		headers?: Record<string, string>;
	} = {},
): Promise<T> {
	const { method = "GET", body, headers = {} } = options;

	const path = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
	const url = `/api${path}`;

	const res = await fetch(url, {
		method,
		credentials: "include",
		headers: {
			"Content-Type": "application/json",
			...headers,
		},
		body: body ? JSON.stringify(body) : undefined,
	});

	if (!res.ok) {
		const errorData = await res.json().catch(() => ({}));
		throw new Error(errorData.error || errorData.message || `API error: ${res.status}`);
	}

	return res.json();
}

export type GuardianChild = {
	id: number;
	name: string;
	email?: string | null;
	birthDate?: string | null;
	sport?: string | null;
	programTier?: string | null;
	planExpiresAt?: string | null;
	createdAt?: string | null;
};

export type ChildCredentials = {
	childName: string;
	email: string;
	temporaryPassword: string;
};

export const guardianService = {
	getChildren: () =>
		apiRequest<{ children: GuardianChild[] }>("/portal/guardian/children"),

	addChildCheckout: (data: {
		childName: string;
		birthDate: string;
		sport?: string;
		injuries?: string;
		performanceGoals?: string;
		planId: number;
		billingCycle: string;
	}) =>
		apiRequest<{ checkoutUrl: string; sessionId?: string }>(
			"/portal/guardian/children/checkout",
			{ method: "POST", body: data },
		),

	getChildCredentials: (token: string) =>
		apiRequest<ChildCredentials>(`/portal/guardian/children/credentials/${token}`),
};
