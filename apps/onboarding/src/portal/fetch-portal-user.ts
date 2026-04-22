import { config } from "@/lib/config";
import {
	PORTAL_SERVICE_UNAVAILABLE,
	PORTAL_UNAUTHORIZED_ERROR,
} from "@/portal/portal-errors";
import type { PortalUser } from "@/portal/portal-types";

export async function fetchPortalUser(token: string): Promise<PortalUser> {
	const baseUrl = config.api.baseUrl.replace(/\/+$/, "");
	const res = await fetch(`${baseUrl}/api/auth/me`, {
		headers: { Authorization: `Bearer ${token}` },
	});

	if (res.status === 401) {
		throw new Error(PORTAL_UNAUTHORIZED_ERROR);
	}
	if (res.status === 503) {
		throw new Error(PORTAL_SERVICE_UNAVAILABLE);
	}
	if (!res.ok) {
		throw new Error("Failed to fetch user data");
	}

	const data = await res.json();
	return data.user as PortalUser;
}
