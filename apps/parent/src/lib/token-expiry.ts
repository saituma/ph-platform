import { decodeJwt } from "jose";

export function isTokenExpired(token: string | null): boolean {
	if (!token) return true;
	try {
		const payload = decodeJwt(token);
		if (typeof payload.exp !== "number") return false;
		return Date.now() >= payload.exp * 1000;
	} catch {
		return true;
	}
}

export function tokenExpiresAt(token: string | null): Date | null {
	if (!token) return null;
	try {
		const payload = decodeJwt(token);
		if (typeof payload.exp !== "number") return null;
		return new Date(payload.exp * 1000);
	} catch {
		return null;
	}
}
