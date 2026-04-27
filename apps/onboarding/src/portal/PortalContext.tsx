import { useQuery } from "@tanstack/react-query";
import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { fetchPortalUser } from "@/portal/fetch-portal-user";
import {
	PORTAL_SERVICE_UNAVAILABLE,
	PORTAL_UNAUTHORIZED_ERROR,
} from "@/portal/portal-errors";
import { portalKeys } from "@/portal/portal-query-keys";
import type { PortalUser } from "@/portal/portal-types";
import { isTokenExpired, msUntilExpiry } from "@/lib/token-expiry";

type PortalContextValue = {
	token: string | null;
	user: PortalUser | null;
	age: number | null;
	loading: boolean;
	error: string | null;
	refresh: () => Promise<void>;
	refreshUser: () => Promise<void>;
};

const PortalContext = createContext<PortalContextValue | null>(null);

function calculateAge(birthDate: string | undefined): number | null {
	if (!birthDate) return null;
	const birth = new Date(birthDate);
	if (Number.isNaN(birth.getTime())) return null;

	const now = new Date();
	let age = now.getFullYear() - birth.getFullYear();
	const monthDiff = now.getMonth() - birth.getMonth();
	if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) {
		age--;
	}
	return age;
}

function readStoredToken(): string | null {
	if (typeof window === "undefined") return null;
	try {
		const stored = localStorage.getItem("auth_token");
		if (stored && isTokenExpired(stored)) {
			localStorage.removeItem("auth_token");
			localStorage.removeItem("pending_email");
			localStorage.removeItem("user_type");
			return null;
		}
		return stored;
	} catch {
		return null;
	}
}

export function PortalProvider({ children }: { children: ReactNode }) {
	const [token, setToken] = useState<string | null>(readStoredToken);

	// SSR hydration: server sets token to null (no window). Re-read on client mount.
	useEffect(() => {
		const stored = readStoredToken();
		if (stored && stored !== token) setToken(stored);
	}, []); // eslint-disable-line react-hooks/exhaustive-deps

	useEffect(() => {
		if (!token) return;
		const ms = msUntilExpiry(token);
		if (ms <= 0) {
			localStorage.removeItem("auth_token");
			setToken(null);
			return;
		}
		if (ms === -1) return;
		const timer = setTimeout(() => {
			localStorage.removeItem("auth_token");
			setToken(null);
		}, ms);
		return () => clearTimeout(timer);
	}, [token]);

	const {
		data: user,
		isLoading: userLoading,
		error: userError,
		refetch,
	} = useQuery({
		queryKey: portalKeys.user(token),
		queryFn: async () => {
			const t = token;
			if (!t) throw new Error("Not authenticated");
			return fetchPortalUser(t);
		},
		enabled: !!token,
		staleTime: 1000 * 60 * 10,
		retry: (failureCount, err) => {
			if (
				err instanceof Error &&
				(err.message === PORTAL_UNAUTHORIZED_ERROR ||
					err.message === PORTAL_SERVICE_UNAVAILABLE)
			) {
				return false;
			}
			return failureCount < 3;
		},
		retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
	});

	const attemptedRecoveryRef = useRef(false);
	useEffect(() => {
		if (!token) return;
		if (userLoading) return;
		if (userError) return;
		if (user) return;
		if (attemptedRecoveryRef.current) return;
		attemptedRecoveryRef.current = true;
		void refetch();
	}, [token, userLoading, userError, user, refetch]);

	const refresh = useCallback(async () => {
		const currentToken = localStorage.getItem("auth_token");
		setToken(currentToken);
		attemptedRecoveryRef.current = false;
		if (currentToken) {
			await refetch();
		}
	}, [refetch]);

	const age = useMemo(() => calculateAge(user?.birthDate), [user?.birthDate]);

	const value = useMemo<PortalContextValue>(
		() => ({
			token,
			user: user ?? null,
			age,
			loading: !!token && userLoading,
			error: userError
				? userError instanceof Error
					? userError.message
					: String(userError)
				: null,
			refresh,
			refreshUser: refresh,
		}),
		[token, user, age, userLoading, userError, refresh],
	);

	return (
		<PortalContext.Provider value={value}>{children}</PortalContext.Provider>
	);
}

export function usePortal() {
	const ctx = useContext(PortalContext);
	if (!ctx) {
		throw new Error("usePortal must be used within PortalProvider");
	}
	return ctx;
}
