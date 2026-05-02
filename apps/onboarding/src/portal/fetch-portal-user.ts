import { config } from "@/lib/config";
import { getAuthHeaders } from "@/lib/client-storage";
import {
	PORTAL_SERVICE_UNAVAILABLE,
	PORTAL_UNAUTHORIZED_ERROR,
} from "@/portal/portal-errors";
import type { PortalUser } from "@/portal/portal-types";

async function fetchWithRetry(url: string, init: RequestInit, retries = 3): Promise<Response> {
	for (let i = 0; i <= retries; i++) {
		try {
			const res = await fetch(url, init);
			if (res.ok || res.status === 401 || res.status === 403) return res;
			if (i < retries) {
				await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
				continue;
			}
			return res;
		} catch (err) {
			if (i >= retries) throw err;
			await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
		}
	}
	throw new Error("Failed to reach server");
}

export async function fetchPortalUser(_token?: string): Promise<PortalUser> {
	const baseUrl = config.api.baseUrl.replace(/\/+$/, "");
	const res = await fetchWithRetry(
		`${baseUrl}/api/auth/me`,
		{ credentials: "include", cache: "no-store", headers: getAuthHeaders() },
	);

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
