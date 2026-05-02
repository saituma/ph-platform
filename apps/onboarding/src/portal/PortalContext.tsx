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
import { clearAuthToken, getTokenStatus } from "@/lib/client-storage";

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

/**
 * We use a sentinel string "cookie" to indicate the token is present in the httpOnly cookie.
 * The actual token value is never exposed to JS — it's sent automatically via cookies.
 */
const COOKIE_TOKEN_SENTINEL = "__cookie_auth__";

export function PortalProvider({ children }: { children: ReactNode }) {
	// "token" here is a sentinel — indicates whether we believe we're authenticated
	const [token, setToken] = useState<string | null>(null);
	const [hydrated, setHydrated] = useState(false);
	const [expiresAt, setExpiresAt] = useState<number | null>(null);

	// On mount, check cookie-based auth status
	useEffect(() => {
		let cancelled = false;
		async function checkAuth() {
			const status = await getTokenStatus();
			if (cancelled) return;
			if (status.authenticated) {
				setToken(COOKIE_TOKEN_SENTINEL);
				setExpiresAt(status.expiresAt);
			} else {
				setToken(null);
				setExpiresAt(null);
			}
			setHydrated(true);
		}
		void checkAuth();
		return () => { cancelled = true; };
	}, []);

	// Auto-expire: set a timer to clear auth state when token expires
	useEffect(() => {
		if (!token || !expiresAt) return;
		const ms = Math.max(0, expiresAt * 1000 - Date.now());
		if (ms <= 0) {
			void clearAuthToken();
			setToken(null);
			return;
		}
		// Cap at 12 hours to avoid setTimeout overflow
		const safeMs = Math.min(ms, 12 * 60 * 60 * 1000);
		const timer = setTimeout(() => {
			void clearAuthToken();
			setToken(null);
		}, safeMs);
		return () => clearTimeout(timer);
	}, [token, expiresAt]);

	const {
		data: user,
		isLoading: userLoading,
		error: userError,
		refetch,
	} = useQuery({
		queryKey: portalKeys.user(token),
		queryFn: async () => {
			if (!token) throw new Error("Not authenticated");
			// fetchPortalUser will use credentials: 'include' — cookie is sent automatically
			return fetchPortalUser(COOKIE_TOKEN_SENTINEL);
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
		const status = await getTokenStatus();
		if (status.authenticated) {
			setToken(COOKIE_TOKEN_SENTINEL);
			setExpiresAt(status.expiresAt);
		} else {
			setToken(null);
			setExpiresAt(null);
		}
		attemptedRecoveryRef.current = false;
		if (status.authenticated) {
			await refetch();
		}
	}, [refetch]);

	const age = useMemo(() => calculateAge(user?.birthDate), [user?.birthDate]);

	const loading = !hydrated || (!!token && userLoading);
	const error = userError
		? userError instanceof Error
			? userError.message
			: String(userError)
		: null;

	const value = useMemo<PortalContextValue>(
		() => ({
			token,
			user: user ?? null,
			age,
			loading,
			error,
			refresh,
			refreshUser: refresh,
		}),
		[token, user, age, loading, error, refresh],
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
