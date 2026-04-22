import { useQuery } from "@tanstack/react-query";
import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useLayoutEffect,
	useMemo,
	useState,
} from "react";
import { fetchPortalUser } from "@/portal/fetch-portal-user";
import {
	PORTAL_SERVICE_UNAVAILABLE,
	PORTAL_UNAUTHORIZED_ERROR,
} from "@/portal/portal-errors";
import { portalKeys } from "@/portal/portal-query-keys";
import type { PortalUser } from "@/portal/portal-types";

type PortalContextValue = {
	token: string | null;
	user: PortalUser | null;
	age: number | null;
	loading: boolean;
	error: string | null;
	refresh: () => Promise<void>;
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

export function PortalProvider({ children }: { children: ReactNode }) {
	const [token, setToken] = useState<string | null>(null);
	/** False until we read `localStorage` on the client so we never flash “not logged in” before the token exists. */
	const [authHydrated, setAuthHydrated] = useState(false);

	useLayoutEffect(() => {
		setToken(localStorage.getItem("auth_token"));
		setAuthHydrated(true);
	}, []);

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
		staleTime: 1000 * 60 * 10, // 10 minutes
		retry: (failureCount, err) => {
			if (
				err instanceof Error &&
				(err.message === PORTAL_UNAUTHORIZED_ERROR ||
					err.message === PORTAL_SERVICE_UNAVAILABLE)
			) {
				return false;
			}
			return failureCount < 1;
		},
	});

	const refresh = useCallback(async () => {
		const currentToken = localStorage.getItem("auth_token");
		setToken(currentToken);
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
			loading:
				!authHydrated || (!!token && userLoading),
			error: userError instanceof Error ? userError.message : null,
			refresh,
		}),
		[token, user, age, authHydrated, userLoading, userError, refresh],
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
