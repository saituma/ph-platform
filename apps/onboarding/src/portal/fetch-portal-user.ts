import { config } from "@/lib/config";
import {
	PORTAL_SERVICE_UNAVAILABLE,
	PORTAL_UNAUTHORIZED_ERROR,
} from "@/portal/portal-errors";
import type { PortalUser } from "@/portal/portal-types";

export async function fetchPortalUser(token: string): Promise<PortalUser> {
	const baseUrl = config.api.baseUrl.replace(/\/+$/, "");
	const doFetch = () =>
		fetch(`${baseUrl}/api/auth/me`, {
			headers: { Authorization: `Bearer ${token}` },
			cache: "no-store",
		});

	let res = await doFetch();

	// Retry once on transient failures (401 edge hop, 5xx, network blip).
	if (res.status === 401 || res.status >= 500) {
		await new Promise((resolve) => setTimeout(resolve, 300));
		res = await doFetch();
	}

	if (res.status === 401) {
		throw new Error(PORTAL_UNAUTHORIZED_ERROR);
	}
	if (res.status === 503) {
		throw new Error(PORTAL_SERVICE_UNAVAILABLE);
	}
	if (!res.ok) {
		throw new Error(`Failed to fetch user data (${res.status})`);
	}

	const data = await res.json();
	if (!data?.user) {
		throw new Error("Server returned no user data");
	}
	return data.user as PortalUser;
}
